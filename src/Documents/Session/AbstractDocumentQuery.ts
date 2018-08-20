import {QueryOperation} from "./Operations/QueryOperation";
import * as BluebirdPromise from "bluebird";
import {GroupByCountToken} from "./Tokens/GroupByCountToken";
import {GroupByToken} from "./Tokens/GroupByToken";
import {FieldsToFetchToken} from "./Tokens/FieldsToFetchToken";
import {DeclareToken} from "./Tokens/DeclareToken";
import {LoadToken} from "./Tokens/LoadToken";
import {FromToken} from "./Tokens/FromToken";
import {DistinctToken} from "./Tokens/DistinctToken";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { QueryStatistics } from "./QueryStatistics";
import { IDocumentSession } from "./IDocumentSession";
import { throwError, getError } from "../../Exceptions";
import { QueryOperator } from "../Queries/QueryOperator";
import { IndexQuery } from "../Queries/IndexQuery";
import {IAbstractDocumentQuery} from "./IAbstractDocumentQuery";
import { GroupBy } from "../Queries/GroupBy";
import { GroupByKeyToken } from "../Session/Tokens/GroupByKeyToken";
import { GroupBySumToken } from "../Session/Tokens/GroupBySumToken";
import { TrueToken } from "../Session/Tokens/TrueToken";
import { WhereToken, WhereOptions } from "../Session/Tokens/WhereToken";
import {QueryFieldUtil} from "../Queries/QueryFieldUtil";
import { QueryToken } from "./Tokens/QueryToken";
import {CloseSubclauseToken} from "./Tokens/CloseSubclauseToken";
import {OpenSubclauseToken} from "./Tokens/OpenSubclauseToken";
import {NegateToken} from "./Tokens/NegateToken";
import { WhereParams } from "./WhereParams";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DateUtil } from "../../Utility/DateUtil";
import { MethodCall } from "./MethodCall";
import {QueryOperatorToken} from "./Tokens/QueryOperatorToken";
import {OrderByToken} from "./Tokens/OrderByToken";
import { QueryResult } from "../Queries/QueryResult";
import {DocumentType} from "../DocumentAbstractions";
import {QueryEventsEmitter} from "./QueryEvents";
import { EventEmitter } from "events";
import * as StringBuilder from "string-builder";
import { StringUtil } from "../../Utility/StringUtil";
import { IntersectMarkerToken } from "./Tokens/IntersectMarkerToken";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { CONSTANTS } from "../../Constants";
import { WhereOperator } from "./Tokens/WhereOperator";
import { OrderingType } from "./OrderingType";
import { SearchOperator } from "../Queries/SearchOperator";
import { DocumentQueryHelper } from "./DocumentQueryHelper";
import { SpatialUnits, SpatialRelation } from "../Indexes/Spatial";
import { ShapeToken } from "./Tokens/ShapeToken";
import { DynamicSpatialField } from "../Queries/Spatial/DynamicSpatialField";
import { SpatialCriteria } from "../Queries/Spatial/SpatialCriteria";
import { SessionBeforeQueryEventArgs } from "./SessionEvents";
import { CmpXchg } from "./CmpXchng";
import { AbstractCallback } from "../../Types/Callbacks";

/**
 * A query against a Raven index
 */
export abstract class AbstractDocumentQuery<T extends object, TSelf extends AbstractDocumentQuery<T, TSelf>> 
    extends EventEmitter
    implements QueryEventsEmitter, IAbstractDocumentQuery<T> {

    protected _clazz: DocumentType<T>;

    private _aliasToGroupByFieldName: { [key: string]: string } = {};

    protected _defaultOperator: QueryOperator = "AND";

    // TBD: private readonly LinqPathProvider _linqPathProvider;

    protected _rootTypes: Set<DocumentType> = new Set<DocumentType>();

    /**
     * Whether to negate the next operation
     */
    protected _negate: boolean;

    private _indexName: string;
    private _collectionName: string;
    private _currentClauseDepth: number;

    protected _queryRaw: string;

    public get indexName() {
        return this._indexName;
    }

    public get collectionName() {
        return this._collectionName;
    }

    protected _queryParameters: { [key: string]: object } = {};

    protected _isIntersect: boolean;

    protected _isGroupBy: boolean;

    protected _theSession: InMemoryDocumentSessionOperations;

    protected _pageSize: number;

    protected _selectTokens: QueryToken[] = [];

    protected _fromToken: FromToken;
    protected _declareToken: DeclareToken;
    protected _loadTokens: LoadToken[];
    protected _fieldsToFetchToken: FieldsToFetchToken;

    protected _whereTokens: QueryToken[] = [];

    protected _groupByTokens: QueryToken[] = [];

    protected _orderByTokens: QueryToken[] = [];

    protected _start: number;

    private _conventions: DocumentConventions;

    protected _timeout: number;

    protected _theWaitForNonStaleResults: boolean;

    protected _includes: Set<string> = new Set();

    private _statsCallback: (stats: QueryStatistics) => void = TypeUtil.NOOP;

    /**
     * Holds the query stats
     */
    protected _queryStats: QueryStatistics = new QueryStatistics();

    protected _disableEntitiesTracking: boolean;

    protected _disableCaching: boolean;

    // TBD protected boolean showQueryTimings;

    // TBD protected boolean shouldExplainScores;

    public get isDistinct(): boolean {
        return this._selectTokens 
            && this._selectTokens.length 
            && this._selectTokens[0] instanceof DistinctToken;
    }

    /**
     * Gets the document convention from the query session
     */
    public get conventions(): DocumentConventions {
        return this._conventions;
    }

    /**
     * Gets the session associated with this document query
     * @return session
     */
    public get session() {
        return this._theSession as any as IDocumentSession;
    }

    // TBD public IAsyncDocumentSession AsyncSession => (IAsyncDocumentSession)TheSession;

    public isDynamicMapReduce(): boolean {
        return this._groupByTokens && !!this._groupByTokens.length;
    }

    private _isInMoreLikeThis: boolean;

    private static _getDefaultTimeout(): number {
        return 25 * 1000;
    }

    // protected AbstractDocumentQuery(Class<T> clazz, InMemoryDocumentSessionOperations session, String indexName,
    //                                 String collectionName, boolean isGroupBy, DeclareToken declareToken,
    //                                 List<LoadToken> loadTokens) {
    //     this(clazz, session, indexName, collectionName, isGroupBy, declareToken, loadTokens, null);
    // }

    protected constructor(
        clazz: DocumentType<T>, 
        session: InMemoryDocumentSessionOperations,
        indexName: string,
        collectionName: string, 
        isGroupBy: boolean,
        declareToken: DeclareToken,
        loadTokens: LoadToken[]);
    protected constructor(
        clazz: DocumentType<T>, 
        session: InMemoryDocumentSessionOperations,
        indexName: string,
        collectionName: string, 
        isGroupBy: boolean,
        declareToken: DeclareToken,
        loadTokens: LoadToken[], 
        fromAlias: string);
    protected constructor(
        clazz: DocumentType<T>, 
        session: InMemoryDocumentSessionOperations,
        indexName: string,
        collectionName: string, 
        isGroupBy: boolean,
        declareToken: DeclareToken,
        loadTokens: LoadToken[], 
        fromAlias: string = null) {
        super();

        this._clazz = clazz;
        this._rootTypes.add(clazz);
        this._isGroupBy = isGroupBy;
        this._indexName = indexName;
        this._collectionName = collectionName;
        this._fromToken = FromToken.create(indexName, collectionName, fromAlias);
        this._declareToken = declareToken;
        this._loadTokens = loadTokens;

        this._theSession = session;

        this.on("afterQueryExecuted", (result: QueryResult) => {
            this._updateStatsAndHighlightings(result);
        });
        
        this._conventions = !session ?
            new DocumentConventions() : 
            session.conventions;
        // TBD _linqPathProvider = new LinqPathProvider(_conventions);
    }

    // tslint:disable:function-name

    private _getCurrentWhereTokens(): QueryToken[] {
        if (!this._isInMoreLikeThis) {
            return this._whereTokens;
        }

        if (!this._whereTokens || !this._whereTokens.length) {
            throwError("InvalidOperationException", 
                "Cannot get MoreLikeThisToken because there are no where token specified.");
        }

        /* TBD
          var moreLikeThisToken = WhereTokens.Last.Value as MoreLikeThisToken;

            if (moreLikeThisToken == null)
                throw new InvalidOperationException($"Last token is not '{nameof(MoreLikeThisToken)}'.");

            return moreLikeThisToken.WhereTokens;
         */
        throwError("NotImplementedException", "More like this");
    }

    private _ensureValidFieldName(fieldName: string, isNestedPath: boolean): string {
        if (!this._theSession 
            || !this._theSession.conventions 
            || isNestedPath 
            || this._isGroupBy) {
            return QueryFieldUtil.escapeIfNecessary(fieldName);
        }

        for (const rootType of this._rootTypes) {
            const identityProperty = this._theSession.conventions.getIdentityProperty(rootType);
            if (identityProperty && identityProperty === fieldName) {
                return CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME;
            }
        }

        return QueryFieldUtil.escapeIfNecessary(fieldName);
    }

    private _appendOperatorIfNeeded(tokens: QueryToken[]): void {
        this._assertNoRawQuery();

        if (!tokens || !tokens.length) {
            return;
        }

        const lastToken = tokens[tokens.length - 1];
        if (!(lastToken instanceof WhereToken) && !(lastToken instanceof CloseSubclauseToken)) {
            return;
        }

        let lastWhere: WhereToken = null;

        for (let i = tokens.length - 1; i >= 0; i--) {
            if (tokens[i] instanceof WhereToken) {
                lastWhere = tokens[i] as WhereToken;
                break;
            }
        }

        let token: QueryOperatorToken = this._defaultOperator === "AND"
            ? QueryOperatorToken.AND
            : QueryOperatorToken.OR;

        if (lastWhere 
            && lastWhere.options.searchOperator) {
            token = QueryOperatorToken.OR; // default to OR operator after search if AND was not specified explicitly
        }

        tokens.push(token);
    }

    private _transformCollection(fieldName: string, values: any[]): object[] {
        const result: object[] = [];
        for (const value of values) {
            if (Array.isArray(value)) {
                result.push(...this._transformCollection(fieldName, value));
            } else {
                const nestedWhereParams = new WhereParams();
                nestedWhereParams.allowWildcards = true;
                nestedWhereParams.fieldName = fieldName;
                nestedWhereParams.value = value;

                result.push(this._transformValue(nestedWhereParams));
            }
        }

        return result;
    }

    private _negateIfNeeded(tokens: QueryToken[], fieldName: string): void {
        if (!this._negate) {
            return;
        }

        this._negate = false;

        if (!tokens || !tokens.length || tokens[tokens.length - 1] instanceof OpenSubclauseToken) {
            if (fieldName) {
                this._whereExists(fieldName);
            } else {
                this._whereTrue();
            }

            this._andAlso();
        }

        tokens.push(NegateToken.INSTANCE);
    }

    public _usingDefaultOperator(operator): void {
        if (!this._whereTokens || !this._whereTokens.length) {
            throwError("InvalidOperationException", 
                "Default operator can only be set before any where clause is added.");
        }

        this._defaultOperator = operator;
    }

    /**
     * Instruct the query to wait for non stale result for the specified wait timeout.
     * This shouldn't be used outside of unit tests unless you are well aware of the implications
     * @param waitTimeout Wait timeout
     */
    public _waitForNonStaleResults(waitTimeout: number): void {
        this._theWaitForNonStaleResults = true;
        this._timeout = waitTimeout || AbstractDocumentQuery._getDefaultTimeout();
    }

    protected _initializeQueryOperation(): QueryOperation {
        const indexQuery = this.getIndexQuery();
        return new QueryOperation(
            this._theSession, 
            this._indexName, 
            indexQuery, 
            this._fieldsToFetchToken, 
            this._disableEntitiesTracking, 
            false, 
            false);
    }

    private _transformValue(whereParams: WhereParams): any;
    private _transformValue(whereParams: WhereParams, forRange: boolean): any;
    private _transformValue(whereParams: WhereParams, forRange: boolean = false): any {
        if (TypeUtil.isNullOrUndefined(whereParams.value)) {
            return null;
        }

        if ("" === (whereParams.value as any)) {
            return "";
        }

        /* TBD
            if (_conventions.TryConvertValueForQuery(
                whereParams.FieldName, whereParams.Value, forRange, out var strVal))
                return strVal;
        */

        const value = whereParams.value;
        if (TypeUtil.isDate(value)) {
            return DateUtil.stringify(value);
        }

        if (TypeUtil.isString(value)) {
            return value;
        }

        if (TypeUtil.isNumber(value)) {
            return value;
        }

        if ((value as any) === false || (value as any) === true) {
            return value;
        }

        return value;

    }

    private _addQueryParameter(value: any): string {
        const parameterName = "p" + Object.keys(this._queryParameters).length;
        this._queryParameters[parameterName] = value;
        return parameterName;
    }

    protected _updateFieldsToFetchToken(fieldsToFetch: FieldsToFetchToken): void {
        this._fieldsToFetchToken = fieldsToFetch;

        if (!this._selectTokens && !this._selectTokens.length) {
            this._selectTokens.push(fieldsToFetch);
        } else {
            const fetchToken = [...this._selectTokens]
                    .filter(x => x instanceof FieldsToFetchToken)[0];

            if (fetchToken) {
                const idx = this._selectTokens.indexOf(fetchToken);
                this._selectTokens[idx] = fieldsToFetch;
            } else {
                this._selectTokens.push(fieldsToFetch);
            }
        }
    }

    public getIndexQuery(): IndexQuery {
        const query = this.toString();
        const indexQuery = this._generateIndexQuery(query);
        this.emit("beforeQueryExecuted", indexQuery);
        return indexQuery;
    }

    /**
     * Gets the fields for projection
     * @return list of projected fields
     */
    public getProjectionFields(): string[] {
        return this._fieldsToFetchToken && 
            this._fieldsToFetchToken.projections 
                ? [...this._fieldsToFetchToken.projections] 
                : [] as string[];
    }

    /**
     * Order the search results randomly using the specified seed
     * this is useful if you want to have repeatable random queries
     * @param seed Seed to use
     */
    public _randomOrdering(): void;
    public _randomOrdering(seed?: string): void;
    public _randomOrdering(seed?: string): void {
        this._assertNoRawQuery();

        if (!seed) {
            this._orderByTokens.push(OrderByToken.random);
            return;
        }

        this._orderByTokens.push(OrderByToken.createRandom(seed));
    }

    // TBD public void _customSortUsing(String typeName)
    // TBD public void _customSortUsing(String typeName, boolean descending)

    protected addGroupByAlias(fieldName: string, projectedName: string): void {
        this._aliasToGroupByFieldName[projectedName] = fieldName;
    }

    private _assertNoRawQuery(): void {
        if (this._queryRaw) {
            throwError("InvalidOperationException",
                "RawQuery was called, cannot modify this query by calling on "
                + "operations that would modify the query (such as Where, Select, OrderBy, GroupBy, etc)");
        }
    }

    public addParameter(name: string, value: any): void {
        name = name.replace(/^\$/, "");
        if (Object.keys(this._queryParameters).indexOf(name) !== -1) {
            throwError("InvalidOperationException", 
                "The parameter " + name + " was already added");
        }

        this._queryParameters[name] = value;
    }

    public _groupBy(fieldName: string, ...fieldNames: string[]): void;
    public _groupBy(field: GroupBy, ...fields: GroupBy[]): void;
    public _groupBy(fieldOrFieldName: GroupBy | string, ...fieldsOrFieldNames: any[]): void {

        if (typeof(fieldOrFieldName) === "string") {
            const mapping = fieldsOrFieldNames.map(x => GroupBy.field(x));
            this._groupBy(GroupBy.field(fieldOrFieldName), ...mapping);
            return;
        }

        if (!this._fromToken.isDynamic) {
            throwError("InvalidOperationException", 
                "groupBy only works with dynamic queries");
        }

        this._assertNoRawQuery();
        this._isGroupBy = true;

        const fieldName = this._ensureValidFieldName((fieldOrFieldName as GroupBy).field, false);

        this._groupByTokens.push(GroupByToken.create(fieldName, (fieldOrFieldName as GroupBy).method));

        if (!fieldsOrFieldNames || !fieldsOrFieldNames.length) {
            return;
        }

        for (const item of fieldsOrFieldNames) {
            fieldOrFieldName = this._ensureValidFieldName((item as GroupBy).field, false);
            this._groupByTokens.push(GroupByToken.create(fieldOrFieldName, (item as GroupBy).method));
        }
    }

    public _groupByKey(fieldName: string): void;
    public _groupByKey(fieldName: string, projectedName: string): void;
    public _groupByKey(fieldName: string, projectedName: string = null): void {
        this._assertNoRawQuery();
        this._isGroupBy = true;

        if (projectedName && this._aliasToGroupByFieldName[projectedName]) {
            const aliasedFieldName = this._aliasToGroupByFieldName[projectedName];
            if (!fieldName || fieldName.toLocaleLowerCase() === (projectedName || "").toLocaleLowerCase()) {
                fieldName = aliasedFieldName;
            }
        } else if (fieldName 
            && Object.keys(this._aliasToGroupByFieldName)
                .reduce((result, next) => result || next === fieldName, false)) {
            const aliasedFieldName = this._aliasToGroupByFieldName[fieldName];
            fieldName = aliasedFieldName;
        }

        this._selectTokens.push(GroupByKeyToken.create(fieldName, projectedName));
    }

    public _groupBySum(fieldName: string): void;
    public _groupBySum(fieldName: string, projectedName: string): void;
    public _groupBySum(fieldName: string, projectedName: string = null): void {
        this._assertNoRawQuery();
        this._isGroupBy = true;

        fieldName = this._ensureValidFieldName(fieldName, false);
        this._selectTokens.push(GroupBySumToken.create(fieldName, projectedName));
    }

    public _groupByCount(): void;
    public _groupByCount(projectedName: string): void;
    public _groupByCount(projectedName: string = null): void {
        this._assertNoRawQuery();
        this._isGroupBy = true;

        this._selectTokens.push(GroupByCountToken.create(projectedName));
    }

    public _whereTrue(): void {
        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, null);

        tokens.push(TrueToken.INSTANCE);
    }

    /* TBD
     public MoreLikeThisScope _moreLikeThis()
        {
            AppendOperatorIfNeeded(WhereTokens);

            var token = new MoreLikeThisToken();
            WhereTokens.AddLast(token);

            _isInMoreLikeThis = true;
            return new MoreLikeThisScope(token, AddQueryParameter, () => _isInMoreLikeThis = false);
        }
     */

    /**
     * Includes the specified path in the query, loading the document specified in that path
     * @param path Path to include
     */
    public _include(path: string): void {
        this._includes.add(path);
    }

    // TBD: public void Include(Expression<Func<T, object>> path)

    public _take(count: number): void {
        this._pageSize = count;
    }

    public _skip(count: number): void {
        this._start = count;
    }

    /**
     * Filter the results from the index using the specified where clause.
     * @param fieldName Field name
     * @param whereClause Where clause
     */
    public _whereLucene(fieldName: string, whereClause: string): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        const whereToken = WhereToken.create("Lucene", fieldName, this._addQueryParameter(whereClause));
        tokens.push(whereToken);
    }

    /**
     * Simplified method for opening a new clause within the query
     */
    public _openSubclause(): void {
        this._currentClauseDepth++;

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, null);

        tokens.push(OpenSubclauseToken.INSTANCE);
    }

    /**
     * Simplified method for closing a clause within the query
     */
    public _closeSubclause(): void {
        this._currentClauseDepth--;

        const tokens: QueryToken[] = this._getCurrentWhereTokens();
        tokens.push(CloseSubclauseToken.INSTANCE);
    }

    public _whereEquals(fieldName: string, method: MethodCall): void;
    public _whereEquals(fieldName: string, method: MethodCall, exact: boolean): void;
    public _whereEquals(fieldName: string, value: any): void;
    public _whereEquals(fieldName: string, value: any, exact: boolean): void;
    public _whereEquals(whereParams: WhereParams): void;
    public _whereEquals(fieldNameOrWhereParams: string | WhereParams, value?: object, exact: boolean = false): void {
        if (!TypeUtil.isObject(fieldNameOrWhereParams)) {
            const params = new WhereParams();
            params.fieldName = fieldNameOrWhereParams as string;
            params.value = value;
            params.exact = exact;
            this._whereEquals(params);
            return;
        }

        const whereParams = fieldNameOrWhereParams as WhereParams;
        if (this._negate) {
            this._negate = false;
            this._whereNotEquals(whereParams);
            return;
        }

        whereParams.fieldName = this._ensureValidFieldName(whereParams.fieldName, whereParams.nestedPath);

        const tokens: QueryToken[] = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);

        if (this._ifValueIsMethod("Equals", whereParams, tokens)) {
            return;
        }

        const transformToEqualValue = this._transformValue(whereParams);
        const addQueryParameter: string = this._addQueryParameter(transformToEqualValue);
        const whereToken = WhereToken.create(
            "Equals", 
            whereParams.fieldName, 
            addQueryParameter, 
            new WhereOptions({
                exact: whereParams.exact
            }));
        tokens.push(whereToken);
    }

    private _ifValueIsMethod(op: WhereOperator, whereParams: WhereParams, tokens: QueryToken[]): boolean {
        if (whereParams.value instanceof MethodCall) {
            const mc = whereParams.value as MethodCall;

            const args = mc.args.map(x => null);
            for (let i = 0; i < mc.args.length; i++) {
                args[i] = this._addQueryParameter(mc.args[i]);
            }

            let token: WhereToken;
            const type = mc.constructor.name;
            if (CmpXchg.name === type) {
                token = WhereToken.create(
                    op, 
                    whereParams.fieldName, 
                    null, 
                    new WhereOptions({
                        methodType: "CmpXchg", 
                        parameters: args, 
                        property: mc.accessPath, 
                        exact: whereParams.exact
                    }));
            } else {
                throwError("InvalidArgumentException", `Unknown method ${type}.`);
            }

            tokens.push(token);
            return true;
        }

        return false;
    }

    public _whereNotEquals(fieldName: string, value: any): void;
    public _whereNotEquals(fieldName: string, value: any, exact: boolean): void ;
    public _whereNotEquals(fieldName: string, method: MethodCall): void;
    public _whereNotEquals(fieldName: string, method: MethodCall, exact: boolean): void;
    public _whereNotEquals(whereParams: WhereParams): void;
    public _whereNotEquals(fieldNameOrWhereParams: string | WhereParams, value?: object, exact: boolean = false): void {
        let whereParams: WhereParams;
        if (TypeUtil.isString(fieldNameOrWhereParams)) {
            whereParams = new WhereParams();
            whereParams.fieldName = fieldNameOrWhereParams as string;
            whereParams.value = value;
            whereParams.exact = exact;

            return this._whereNotEquals(whereParams);
        }

        whereParams = fieldNameOrWhereParams as WhereParams;
        if (this._negate) {
            this._negate = false;
            this._whereEquals(whereParams);
            return;
        }

        const transformToEqualValue = this._transformValue(whereParams);

        const tokens: QueryToken[] = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);

        whereParams.fieldName = this._ensureValidFieldName(whereParams.fieldName, whereParams.nestedPath);

        if (this._ifValueIsMethod("NotEquals", whereParams, tokens)) {
            return;
        }

        const whereToken = WhereToken.create(
            "NotEquals", 
            whereParams.fieldName, 
            this._addQueryParameter(transformToEqualValue), 
            new WhereOptions(whereParams.exact));
        tokens.push(whereToken);
    }

    public negateNext(): void {
        this._negate = !this._negate;
    }

    /**
     * Check that the field has one of the specified value
     * @param fieldName Field name to use
     * @param values Values to find
     * @param exact Use exact matcher
     */
    public _whereIn(fieldName: string, values: any[]): void;
    public _whereIn(fieldName: string, values: any[], exact: boolean): void;
    public _whereIn(fieldName: string, values: any[], exact: boolean = false): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        const whereToken = WhereToken.create(
            "In", 
            fieldName, 
            this._addQueryParameter(
                this._transformCollection(fieldName, AbstractDocumentQuery._unpackCollection(values))));
        tokens.push(whereToken);
    }

    public _whereStartsWith(fieldName: string, value: any): void {
        const whereParams = new WhereParams();
        whereParams.fieldName = fieldName;
        whereParams.value = value;
        whereParams.allowWildcards = true;

        const transformToEqualValue = this._transformValue(whereParams);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);

        whereParams.fieldName = this._ensureValidFieldName(whereParams.fieldName, whereParams.nestedPath);
        this._negateIfNeeded(tokens, whereParams.fieldName);

        const whereToken = WhereToken.create(
            "StartsWith", whereParams.fieldName, this._addQueryParameter(transformToEqualValue));
        tokens.push(whereToken);
    }

    /**
     * Matches fields which ends with the specified value.
     * @param fieldName Field name to use
     * @param value Values to find
     */
    public _whereEndsWith(fieldName: string, value: any): void {
        const whereParams = new WhereParams();
        whereParams.fieldName = fieldName;
        whereParams.value = value;
        whereParams.allowWildcards = true;

        const transformToEqualValue = this._transformValue(whereParams);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);

        whereParams.fieldName = this._ensureValidFieldName(whereParams.fieldName, whereParams.nestedPath);
        this._negateIfNeeded(tokens, whereParams.fieldName);

        const whereToken = WhereToken.create(
            "EndsWith", whereParams.fieldName, this._addQueryParameter(transformToEqualValue));
        tokens.push(whereToken);
    }

    /**
     * Matches fields where the value is between the specified start and end, exclusive
     * @param fieldName Field name to use
     * @param start Range start
     * @param end Range end
     * @param exact Use exact matcher
     */
    public _whereBetween(fieldName: string, start: any, end: any): void;
    public _whereBetween(fieldName: string, start: any, end: any, exact: boolean): void;
    public _whereBetween(fieldName: string, start: any, end: any, exact: boolean = false): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        const startParams = new WhereParams();
        startParams.value = start;
        startParams.fieldName = fieldName;

        const endParams = new WhereParams();
        endParams.value = end;
        endParams.fieldName = fieldName;

        const fromParameterName = this._addQueryParameter(
            !start ? "*" : this._transformValue(startParams, true));
        const toParameterName = this._addQueryParameter(
            !start ? "NULL" : this._transformValue(endParams, true));

        const whereToken = WhereToken.create(
            "Between", fieldName, null, new WhereOptions({
                exact, 
                from: fromParameterName, 
                to: toParameterName
            }));
        tokens.push(whereToken);
    }

    /**
     * Matches fields where the value is greater than the specified value
     * @param fieldName Field name to use
     * @param value Value to compare
     * @param exact Use exact matcher
     */
    public _whereGreaterThan(fieldName: string, value: any): void;
    public _whereGreaterThan(fieldName: string, value: any, exact: boolean): void;
    public _whereGreaterThan(fieldName: string, value: any, exact: boolean = false): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);
        const whereParams = new WhereParams();
        whereParams.value = value;
        whereParams.fieldName = fieldName;

        const parameter = this._addQueryParameter(
            !value ? "*" : this._transformValue(whereParams, true));

        const whereToken = WhereToken.create(
            "GreaterThan", fieldName, parameter, new WhereOptions({ exact }));
        tokens.push(whereToken);
    }

    /**
     * Matches fields where the value is greater than or equal to the specified value
     * @param fieldName Field name to use
     * @param value Value to compare
     * @param exact Use exact matcher
     */
    public _whereGreaterThanOrEqual(fieldName: string, value: any): void; 
    public _whereGreaterThanOrEqual(fieldName: string, value: any, exact: boolean): void; 
    public _whereGreaterThanOrEqual(fieldName: string, value: any, exact: boolean = false): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);
        const whereParams = new WhereParams();
        whereParams.value = value;
        whereParams.fieldName = fieldName;

        const parameter = this._addQueryParameter(
            !value ? "*" : this._transformValue(whereParams, true));
        const whereToken = WhereToken.create(
            "GreaterThanOrEqual", fieldName, parameter, new WhereOptions({ exact }));
        tokens.push(whereToken);
    }

    public _whereLessThan(fieldName: string, value: any): void;
    public _whereLessThan(fieldName: string, value: any, exact: boolean): void;
    public _whereLessThan(fieldName: string, value: any, exact: boolean = false): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        const whereParams = new WhereParams();
        whereParams.value = value;
        whereParams.fieldName = fieldName;

        const parameter = this._addQueryParameter(
            !value ? "NULL" : this._transformValue(whereParams, true));
        const whereToken = WhereToken.create(
            "LessThan", fieldName, parameter, new WhereOptions({ exact }));
        tokens.push(whereToken);
    }

    public _whereLessThanOrEqual(fieldName: string, value: any): void;
    public _whereLessThanOrEqual(fieldName: string, value: any, exact: boolean): void;
    public _whereLessThanOrEqual(fieldName: string, value: any, exact: boolean = false): void {
        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        const whereParams = new WhereParams();
        whereParams.value = value;
        whereParams.fieldName = fieldName;

        const parameter = this._addQueryParameter(
            !value ? "NULL" : this._transformValue(whereParams, true));
        const whereToken = WhereToken.create(
            "LessThanOrEqual", fieldName, parameter, new WhereOptions({ exact }));
        tokens.push(whereToken);
    }

    /**
     * Matches fields where Regex.IsMatch(filedName, pattern)
     * @param fieldName Field name to use
     * @param pattern Regexp pattern
     */
    public _whereRegex(fieldName: string, pattern: string): void {
        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        const whereParams = new WhereParams();
        whereParams.value = pattern;
        whereParams.fieldName = fieldName;

        const parameter = this._addQueryParameter(this._transformValue(whereParams));

        const whereToken = WhereToken.create(
            "Regex", fieldName, parameter);
        tokens.push(whereToken);
    }

    public _andAlso(): void {
        const tokens = this._getCurrentWhereTokens();
        if (!tokens && !tokens.length) {
            return;
        }

        if (tokens[tokens.length - 1] instanceof QueryOperatorToken) {
            throwError("InvalidOperationException", 
                "Cannot add AND, previous token was already an operator token.");
        }

        tokens.push(QueryOperatorToken.AND);
    }

    /**
     * Add an OR to the query
     */
    public _orElse(): void {
        const tokens = this._getCurrentWhereTokens();
        if (!tokens && !tokens.length) {
            return;
        }

        if (tokens[tokens.length - 1] instanceof QueryOperatorToken) {
            throwError("InvalidOperationException", 
                "Cannot add OR, previous token was already an operator token.");
        }

        tokens.push(QueryOperatorToken.OR);
    }

    /**
     * Specifies a boost weight to the last where clause.
     * The higher the boost factor, the more relevant the term will be.
     * <p>
     * boosting factor where 1.0 is default, less than 1.0 is lower weight, greater than 1.0 is higher weight
     * <p>
     * http://lucene.apache.org/java/2_4_0/queryparsersyntax.html#Boosting%20a%20Term
     *
     * @param boost Boost value
     */
    public _boost(boost: number): void  {
        if (boost === 1.0) {
            return;
        }

        const tokens = this._getCurrentWhereTokens();
        if (!tokens && !tokens.length) {
            throwError("InvalidOperationException", "Missing where clause.");
        }

        const whereToken = tokens[tokens.length - 1];
        if (!(whereToken instanceof WhereToken)) {
            throwError("InvalidOperationException", "Missing where clause.");
        }

        if (boost <= 0.0) {
            throwError("InvalidArgumentException", "Boost factor must be a positive number.");
        }

        (whereToken as WhereToken).options.boost = boost;
    }

    /**
     * Specifies a fuzziness factor to the single word term in the last where clause
     * <p>
     * 0.0 to 1.0 where 1.0 means closer match
     * <p>
     * http://lucene.apache.org/java/2_4_0/queryparsersyntax.html#Fuzzy%20Searches
     * @param fuzzy Fuzzy value
     */
    public _fuzzy(fuzzy: number): void {
        const tokens = this._getCurrentWhereTokens();
        if (!tokens && !tokens.length) {
            throwError("InvalidOperationException", "Missing where clause.");
        }

        const whereToken = tokens[tokens.length - 1];
        if (!(whereToken instanceof WhereToken)) {
            throwError("InvalidOperationException", "Missing where clause.");
        }

        if (fuzzy < 0.0 || fuzzy > 1.0) {
            throwError("InvalidArgumentException", "Fuzzy distance must be between 0.0 and 1.0.");
        }

        (whereToken as WhereToken).options.fuzzy = fuzzy;
    }

    /**
     * Specifies a proximity distance for the phrase in the last where clause
     * <p>
     * http://lucene.apache.org/java/2_4_0/queryparsersyntax.html#Proximity%20Searches
     * @param proximity Proximity value
     */
    public _proximity(proximity: number): void {
        const tokens = this._getCurrentWhereTokens();
        if (!tokens && !tokens.length) {
            throwError("InvalidOperationException", "Missing where clause.");
        }

        const whereToken = tokens[tokens.length - 1];
        if (!(whereToken instanceof WhereToken)) {
            throwError("InvalidOperationException", "Missing where clause.");
        }

        if (proximity < 1) {
            throwError("InvalidArgumentException", "Proximity distance must be a positive number.");
        }

        (whereToken as WhereToken).options.proximity = proximity;
    }

    /**
     * Order the results by the specified fields
     * The fields are the names of the fields to sort, defaulting to sorting by ascending.
     * You can prefix a field name with '-' to indicate sorting by descending or '+' to sort by ascending
     * @param field field to use in order
     * @param ordering Ordering type
     */
    public _orderBy(field: string): void;
    public _orderBy(field: string, ordering: OrderingType): void;
    public _orderBy(field: string, ordering: OrderingType = "String"): void {
        this._assertNoRawQuery();
        const f = this._ensureValidFieldName(field, false);
        this._orderByTokens.push(OrderByToken.createAscending(f, ordering));
    }

    /**
     * Order the results by the specified fields
     * The fields are the names of the fields to sort, defaulting to sorting by descending.
     * You can prefix a field name with '-' to indicate sorting by descending or '+' to sort by ascending
     * @param field Field to use
     * @param ordering Ordering type
     */
    public _orderByDescending(field: string): void;
    public _orderByDescending(field: string, ordering: OrderingType): void;
    public _orderByDescending(field: string, ordering: OrderingType = "String"): void {
        this._assertNoRawQuery();
        const f = this._ensureValidFieldName(field, false);
        this._orderByTokens.push(OrderByToken.createDescending(f, ordering));
    }

    public _orderByScore(): void {
        this._assertNoRawQuery();

        this._orderByTokens.push(OrderByToken.scoreAscending);
    }

    public _orderByScoreDescending(): void {
        this._assertNoRawQuery();
        this._orderByTokens.push(OrderByToken.scoreDescending);
    }

    /**
     * Provide statistics about the query, such as total count of matching records
     * @param stats Output parameter for query statistics
     */
    public _statistics(statsCallback: (stats: QueryStatistics) => void): void {
        statsCallback(this._queryStats);
    }

    // TBD public void InvokeAfterStreamExecuted(BlittableJsonReaderObject result)

    /**
     * Generates the index query.
     * @param query Query
     * @return Index query
     */
    protected _generateIndexQuery(query: string): IndexQuery {
        const indexQuery = new IndexQuery();
        indexQuery.query = query;
        indexQuery.start = this._start;
        indexQuery.waitForNonStaleResults = this._theWaitForNonStaleResults;
        indexQuery.waitForNonStaleResultsTimeout = this._timeout;
        indexQuery.queryParameters = this._queryParameters;
        indexQuery.disableCaching = this._disableCaching;
        // TBD indexQuery.setShowTimings(showQueryTimings);
        // TBD indexQuery.setExplainScores(shouldExplainScores);

        if (this._pageSize) {
            indexQuery.pageSize = this._pageSize;
        }

        return indexQuery;
    }

    /**
     * Perform a search for documents which fields that match the searchTerms.
     * If there is more than a single term, each of them will be checked independently.
     * @param fieldName Field name
     * @param searchTerms Search terms
     * @param operator Search operator
     */
    public _search(fieldName: string, searchTerms: string): void;
    public _search(fieldName: string, searchTerms: string, operator: SearchOperator): void;
    public _search(fieldName: string, searchTerms: string, operator: SearchOperator = "OR"): void {
        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);

        fieldName = this._ensureValidFieldName(fieldName, false);
        this._negateIfNeeded(tokens, fieldName);

        const whereToken = WhereToken.create(
            "Search", fieldName, this._addQueryParameter(searchTerms), new WhereOptions({ search: operator }));
        tokens.push(whereToken);
    }

    public toString(): string {
        if (this._queryRaw) {
            return this._queryRaw;
        }

        if (this._currentClauseDepth) {
            throwError("InvalidOperationException",
                "A clause was not closed correctly within this query, current clause depth = " 
                    + this._currentClauseDepth);
        }

        const queryText = new StringBuilder();
        this._buildDeclare(queryText);
        this._buildFrom(queryText);
        this._buildGroupBy(queryText);
        this._buildWhere(queryText);
        this._buildOrderBy(queryText);

        this._buildLoad(queryText);
        this._buildSelect(queryText);
        this._buildInclude(queryText);

        return queryText.toString();
    }

    private _buildInclude(queryText: StringBuilder): void {
        if (!this._includes || !this._includes.size) {
            return;
        }

        queryText.append(" include ");
        let first = true;
        for (const include of this._includes) {
            if (!first) {
                queryText.append(",");
            }
            first = false;

            let requiredQuotes: boolean = false;

            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < include.length; i++) {
                const ch = include[i];
                if (!StringUtil.isLetterOrDigit(ch) && ch !== "_" && ch !== ".") {
                    requiredQuotes = true;
                    break;
                }
            }

            if (requiredQuotes) {
                queryText.append("'").append(include.replace(/'/g, "\'")).append("'");
            } else {
                queryText.append(include);
            }
        }
    }

    public _intersect(): void {
        const tokens = this._getCurrentWhereTokens();
        if (tokens.length > 0) {
            const last = tokens[tokens.length - 1];
            if (last instanceof WhereToken || last instanceof CloseSubclauseToken) {
                this._isIntersect = true;

                tokens.push(IntersectMarkerToken.INSTANCE);
                return;
            }
        }

        throwError("InvalidOperationException", "Cannot add INTERSECT at this point.");
    }

    public _whereExists(fieldName: string): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        tokens.push(WhereToken.create("Exists", fieldName, null));
    }

    public _containsAny(fieldName: string, values: any[]): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        const array = this._transformCollection(fieldName, AbstractDocumentQuery._unpackCollection(values));
        const whereToken = WhereToken.create(
            "In", fieldName, this._addQueryParameter(array), new WhereOptions({ exact: false }));
        tokens.push(whereToken);
    }

    public _containsAll(fieldName: string, values: any[]): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        const array = this._transformCollection(fieldName, AbstractDocumentQuery._unpackCollection(values));

        if (!array.length) {
            tokens.push(TrueToken.INSTANCE);
            return;
        }

        const whereToken = WhereToken.create(
            "AllIn", fieldName, this._addQueryParameter(array));
        tokens.push(whereToken);
    }

    public addRootType(clazz: DocumentType): void  {
        this._rootTypes.add(clazz);
    }

    // TBD public string GetMemberQueryPathForOrderBy(Expression expression)
    // TBD public string GetMemberQueryPath(Expression expression)

    public _distinct(): void {
        if (this.isDistinct) {
            throwError("InvalidOperationException", "This is already a distinct query.");
        }

        if (!this._selectTokens.length) {
            this._selectTokens.push(DistinctToken.INSTANCE);
        } else {
            this._selectTokens.unshift(DistinctToken.INSTANCE);
        }
    }

    private _updateStatsAndHighlightings(queryResult: QueryResult): void {
        this._queryStats.updateQueryStats(queryResult);
        // TBD: Highlightings.Update(queryResult);
    }

    private _buildSelect(writer: StringBuilder): void {
        if (!this._selectTokens || !this._selectTokens.length) {
            return;
        }

        writer.append(" select ");
        if (this._selectTokens.length === 1 && this._selectTokens[0] instanceof DistinctToken) {
            this._selectTokens[0].writeTo(writer);
            writer.append(" *");

            return;
        }

        for (let i = 0; i < this._selectTokens.length; i++) {
            const token = this._selectTokens[i];
            if (i > 0 && !(this._selectTokens[i - 1] instanceof DistinctToken)) {
                writer.append(",");
            }

            DocumentQueryHelper.addSpaceIfNeeded(
                i > 0 ? this._selectTokens[i - 1] : null, token, writer);

            token.writeTo(writer);
        }
    }

    private _buildFrom(writer: StringBuilder) {
        this._fromToken.writeTo(writer);
    }

    private _buildDeclare(writer: StringBuilder): void {
        if (this._declareToken) {
            this._declareToken.writeTo(writer);
        }
    }

    private _buildLoad(writer: StringBuilder): void {
        if (!this._loadTokens || !this._loadTokens.length) {
            return;
        }

        writer.append(" load ");

        for (let i = 0; i < this._loadTokens.length; i++) {
            if (i !== 0) {
                writer.append(", ");
            }

            this._loadTokens[i].writeTo(writer);
        }
    }

    private _buildWhere(writer: StringBuilder) {
        if (!this._whereTokens || !this._whereTokens.length) {
            return;
        }

        writer
                .append(" where ");

        if (this._isIntersect) {
            writer
                    .append("intersect(");
        }

        for (let i = 0; i < this._whereTokens.length; i++) {
            DocumentQueryHelper.addSpaceIfNeeded(
                i > 0 ? this._whereTokens[i - 1] : null, 
                this._whereTokens[i], 
                writer);
            this._whereTokens[i].writeTo(writer);
        }

        if (this._isIntersect) {
            writer.append(") ");
        }
    }

    private _buildGroupBy(writer: StringBuilder): void {
        if (!this._groupByTokens || !this._groupByTokens.length) {
            return;
        }

        writer
                .append(" group by ");

        let isFirst = true;

        for (const token of this._groupByTokens) {
            if (!isFirst) {
                writer.append(", ");
            }

            token.writeTo(writer);
            isFirst = false;
        }
    }

    private _buildOrderBy(writer: StringBuilder): void {
        if (!this._orderByTokens || !this._orderByTokens.length) {
            return;
        }

        writer
                .append(" order by ");

        let isFirst = true;

        for (const token of this._orderByTokens) {
            if (!isFirst) {
                writer.append(", ");
            }

            token.writeTo(writer);
            isFirst = false;
        }
    }

    private static _unpackCollection(items: object[]): object[] {
        const results = [];

        for (const item of items) {
            if (Array.isArray(item)) {
                results.push(...AbstractDocumentQuery._unpackCollection(item as any[]));
            } else {
                results.push(item);
            }
        }

        return results;
    }

    // TBD protected Action<BlittableJsonReaderObject> AfterStreamExecutedCallback;

    protected _queryOperation: QueryOperation;

    public queryOperation(): QueryOperation {
        return this._queryOperation;
    }

    // TBD public IDocumentQueryCustomization AfterStreamExecuted(Action<BlittableJsonReaderObject> action)

    public _noTracking(): void {
        this._disableEntitiesTracking = true;
    }

    public _noCaching(): void {
        this._disableCaching = true;
    }

    // TBD public void _showTimings()
    // TBD protected List<HighlightedField> HighlightedFields = new List<HighlightedField>();
    // TBD protected string[] HighlighterPreTags = new string[0];
    // TBD protected string[] HighlighterPostTags = new string[0];
    // TBD protected string HighlighterKeyName;
    // TBD protected QueryHighlightings Highlightings = new QueryHighlightings();
    // TBD public void SetHighlighterTags(string preTag, string postTag)
    // TBD public void Highlight(string fieldName, int fragmentLength, int fragmentCount, string fragmentsField)
    // TBD public void Highlight(
    //    string fieldName, 
    //    int fragmentLength, 
    //    int fragmentCount, 
    //    out FieldHighlightings fieldHighlightings)
    // TBD public void Highlight(
    //    string fieldName, 
    //    string fieldKeyName, 
    //    int fragmentLength, 
    //    int fragmentCount, 
    //    out FieldHighlightings fieldHighlightings)
    // TBD public void SetHighlighterTags(string[] preTags, string[] postTags)

    protected _withinRadiusOf(
        fieldName: string, 
        radius: number, 
        latitude: number, 
        longitude: number, 
        radiusUnits: SpatialUnits, 
        distErrorPercent: number): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        const whereToken = WhereToken.create(
            "SpatialWithin", 
            fieldName, 
            null, 
            new WhereOptions({
                shape: ShapeToken.circle(
                    this._addQueryParameter(radius), 
                    this._addQueryParameter(latitude), 
                    this._addQueryParameter(longitude), radiusUnits),
                distance: distErrorPercent
            }));
        tokens.push(whereToken);
    }

    protected _spatialByShapeWkt(
        fieldName: string, shapeWkt: string, relation: SpatialRelation, distErrorPercent: number): void {
        fieldName = this._ensureValidFieldName(fieldName, false);

        const tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, fieldName);

        const wktToken = ShapeToken.wkt(this._addQueryParameter(shapeWkt));

        let whereOperator: WhereOperator;
        switch (relation) {
            case "Within":
                whereOperator = "SpatialWithin";
                break;
            case "Contains":
                whereOperator = "SpatialContains";
                break;
            case "Disjoint":
                whereOperator = "SpatialDisjoint";
                break;
            case "Intersects":
                whereOperator = "SpatialIntersects";
                break;
            default:
                throwError("InvalidArgumentException", `relation: ${relation}.`);
        }

        tokens.push(WhereToken.create(
            whereOperator, fieldName, null, new WhereOptions({ 
                shape: wktToken, 
                distance: distErrorPercent 
            })));
    }

    public _spatial(dynamicField: DynamicSpatialField, criteria: SpatialCriteria): void; 
    public _spatial(fieldName: string, criteria: SpatialCriteria): void; 
    public _spatial(fieldNameOrDynamicSpatialField: string | DynamicSpatialField, criteria: SpatialCriteria): void {

        let tokens: QueryToken[];
        if (typeof(fieldNameOrDynamicSpatialField) === "string") {
            const fieldName = this._ensureValidFieldName(fieldNameOrDynamicSpatialField, false);

            tokens = this._getCurrentWhereTokens();
            this._appendOperatorIfNeeded(tokens);
            this._negateIfNeeded(tokens, fieldName);

            tokens.push(criteria.toQueryToken(fieldName, (o) => this._addQueryParameter(o)));
            return;
        }

        const dynamicField = fieldNameOrDynamicSpatialField as DynamicSpatialField;
        tokens = this._getCurrentWhereTokens();
        this._appendOperatorIfNeeded(tokens);
        this._negateIfNeeded(tokens, null);

        tokens.push(criteria.toQueryToken(
            dynamicField.toField(
                (fName, isNestedPath) => this._ensureValidFieldName(fName, isNestedPath)),
                (o) => this._addQueryParameter(o)));
    }

    public _orderByDistance(field: DynamicSpatialField, latitude: number, longitude: number): void;
    public _orderByDistance(field: DynamicSpatialField, shapeWkt: string): void;
    public _orderByDistance(fieldName: string, latitude: number, longitude: number): void;
    public _orderByDistance(fieldName: string, shapeWkt: string): void;
    public _orderByDistance(
        fieldNameOrField: string | DynamicSpatialField, shapeWktOrLatitude: string | number, longitude?: number): void {

        if (TypeUtil.isString(fieldNameOrField)) {
            if (TypeUtil.isString(shapeWktOrLatitude)) {
                this._orderByTokens.push(
                    OrderByToken.createDistanceAscending(
                        fieldNameOrField as string, this._addQueryParameter(shapeWktOrLatitude)));

            } else {
                this._orderByTokens.push(
                    OrderByToken.createDistanceAscending(
                        fieldNameOrField as string, 
                        this._addQueryParameter(shapeWktOrLatitude), this._addQueryParameter(longitude)));
            }

            return;
        }

        const field = fieldNameOrField as DynamicSpatialField;
        if (!fieldNameOrField) {
            throwError("InvalidArgumentException", "Field cannot be null.");
        }

        if (TypeUtil.isString(shapeWktOrLatitude)) {
            this._orderByDistance(
                "'" + field.toField((f, isNestedPath) =>
                    this._ensureValidFieldName(f, isNestedPath)) + "'", shapeWktOrLatitude as string);
        } else {
            this._orderByDistance(
                "'" + field.toField((f, isNestedPath) =>
                    this._ensureValidFieldName(f, isNestedPath)) + "'", shapeWktOrLatitude as number, longitude);
        }
    }
    
    public _orderByDistanceDescending(field: DynamicSpatialField, latitude: number, longitude: number): void;
    public _orderByDistanceDescending(field: DynamicSpatialField, shapeWkt: string): void;
    public _orderByDistanceDescending(fieldName: string, latitude: number, longitude: number): void;
    public _orderByDistanceDescending(fieldName: string, shapeWkt: string): void;
    public _orderByDistanceDescending(
        fieldNameOrField: string | DynamicSpatialField, shapeWktOrLatitude: string | number, longitude?: number): void {

        if (TypeUtil.isString(fieldNameOrField)) {
            if (TypeUtil.isString(shapeWktOrLatitude)) {
                this._orderByTokens.push(
                    OrderByToken.createDistanceDescending(
                        fieldNameOrField as string, this._addQueryParameter(shapeWktOrLatitude)));

            } else {
                this._orderByTokens.push(
                    OrderByToken.createDistanceDescending(
                        fieldNameOrField as string, 
                        this._addQueryParameter(shapeWktOrLatitude), this._addQueryParameter(longitude)));
            }

            return;
        }

        const field = fieldNameOrField as DynamicSpatialField;
        if (!fieldNameOrField) {
            throwError("InvalidArgumentException", "Field cannot be null.");
        }

        if (TypeUtil.isString(shapeWktOrLatitude)) {
            this._orderByDistanceDescending(
                "'" + field.toField((f, isNestedPath) =>
                    this._ensureValidFieldName(f, isNestedPath)) + "'", shapeWktOrLatitude as string);
        } else {
            this._orderByDistanceDescending(
                "'" + field.toField((f, isNestedPath) =>
                    this._ensureValidFieldName(f, isNestedPath)) + "'", shapeWktOrLatitude as number, longitude);
        }
    }

    protected _initSync(): Promise<void> {
        if (this._queryOperation) {
            return Promise.resolve();
        }

        const beforeQueryEventArgs = new SessionBeforeQueryEventArgs(this._theSession);
        this._theSession.emit("beforeQuery", beforeQueryEventArgs);

        this._queryOperation = this._initializeQueryOperation();
        return this._executeActualQuery();
    }

    private _executeActualQuery(): Promise<void> {
        let context;
        let command;
        const result = BluebirdPromise.resolve()
            .then(() => {
                context = this._queryOperation.enterQueryContext();
                command = this._queryOperation.createRequest();
                return this._theSession.requestExecutor.execute(command, this._theSession.sessionInfo);
            })
            .then(() => {
                this._queryOperation.setResult(command.result);
                this.emit("afterQueryExecuted", this._queryOperation.getCurrentQueryResults());
            })
            .finally(() => {
                if (context) {
                    context.dispose();
                }
            });

        return Promise.resolve(result);
    }

    public async iterator(): Promise<IterableIterator<T>> {
        return Promise.resolve()
            .then(() => this._initSync())
            .then(() => {
                const results = this._queryOperation.complete<T>(this._clazz);
                return results[Symbol.iterator]();
            });
    }

    public async all(callback?: AbstractCallback<T[]>): Promise<T[]> {
        callback = callback || TypeUtil.NOOP;
        const result = BluebirdPromise.resolve(this.iterator())
            .then((entries) => [...entries])
            .tap(x => callback(null, x))
            .tapCatch(err => callback(err));
        return Promise.resolve(result);
    }

    public getQueryResult(): Promise<QueryResult> {
        return Promise.resolve()
            .then(() => this._initSync())
            .then(() => this._queryOperation.getCurrentQueryResults().createSnapshot());
    }

    public async first(callback?: AbstractCallback<T>): Promise<T> {
        callback = callback || TypeUtil.NOOP;
        const result = BluebirdPromise.resolve()
            .then(() => this._executeQueryOperation(2))
            .then(entries => entries[0] || null)
            .tap(x => callback(null, x))
            .tapCatch(err => callback(err));
        return Promise.resolve(result);
    }

    public async single(callback?: AbstractCallback<T>): Promise<T> {
        callback = callback || TypeUtil.NOOP;
        const result = BluebirdPromise.resolve()
            .then(() => this._executeQueryOperation(2))
            .then(entries => {
                if (entries.length > 1) {
                    throw getError("InvalidOperationException", "Expected single result, got: " + entries.length);
                }

                return entries[0] || null;
            })
            .tap(x => callback(null, x))
            .tapCatch(err => callback(err));
        return Promise.resolve(result);
    }

    public async count(callback?: AbstractCallback<number>): Promise<number> {
        callback = callback || TypeUtil.NOOP;
        this._take(0);
        const result = BluebirdPromise.resolve(this.getQueryResult())
            .then(queryResult => queryResult.totalResults)
            .tap(x => callback(null, x))
            .tapCatch(err => callback(err));
        return Promise.resolve(result);
    }

    private _executeQueryOperation(take?: number): Promise<T[]> {
        if ((take || take === 0) && (!this._pageSize || this._pageSize > take)) {
            this._take(take);
        }

        return Promise.resolve()
            .then(() => this._initSync())
            .then(() => {
                return this._queryOperation.complete<T>(this._clazz);
            });
    }
    // tslint:enable:function-name

    public async any(): Promise<boolean> {
        if (this.isDistinct) {
            // for distinct it is cheaper to do count 1
            const result = await this._executeQueryOperation(1);
            return !!result[0];

        }

        this._take(0);
        const queryResult = await this.getQueryResult();
        return queryResult.totalResults > 0;
    }
}
