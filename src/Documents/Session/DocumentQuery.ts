import { AbstractDocumentQuery } from "./AbstractDocumentQuery";
import { IDocumentQuery } from "./IDocumentQuery";
import { DocumentType } from "../DocumentAbstractions";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { DeclareToken } from "./Tokens/DeclareToken";
import { LoadToken } from "./Tokens/LoadToken";
import { throwError } from "../../Exceptions";
import { CONSTANTS } from "../../Constants";
import { QueryData } from "../Queries/QueryData";
import { OrderingType } from "./OrderingType";
import { SearchOperator } from "../Queries/SearchOperator";
import { QueryStatistics } from "./QueryStatistics";
import { QueryOperator } from "../Queries/QueryOperator";
import { MethodCall } from "./MethodCall";
import { WhereParams } from "./WhereParams";
import { IGroupByDocumentQuery } from "./IGroupByDocumentQuery";
import { GroupBy } from "../Queries/GroupBy";
import { GroupByDocumentQuery } from "./GroupByDocumentQuery";
import { FieldsToFetchToken } from "./Tokens/FieldsToFetchToken";
import { SpatialCriteriaFactory } from "../Queries/Spatial/SpatialCriteriaFactory";
import { SpatialCriteria } from "../Queries/Spatial/SpatialCriteria";
import { DynamicSpatialField } from "../Queries/Spatial/DynamicSpatialField";
import { SpatialUnits, SpatialRelation } from "../Indexes/Spatial";
import { TypeUtil } from "../../Utility/TypeUtil";
import { IFacetBuilder } from "../Queries/Facets/IFacetBuilder";
import { IAggregationDocumentQuery } from "../Queries/Facets/IAggregationDocumentQuery";
import { Facet } from "../Queries/Facets/Facet";
import { FacetBase } from "../Queries/Facets/FacetBase";
import { FacetBuilder } from "../Queries/Facets/FacetBuilder";
import { AggregationDocumentQuery } from "../Queries/Facets/AggregationDocumentQuery";
import { MoreLikeThisBase } from "../Queries/MoreLikeThis/MoreLikeThisBase";
import { IMoreLikeThisBuilderForDocumentQuery } from "../Queries/MoreLikeThis/IMoreLikeThisBuilderForDocumentQuery";
import { MoreLikeThisUsingDocument } from "../Queries/MoreLikeThis/MoreLikeThisUsingDocument";
import { MoreLikeThisBuilder } from "../Queries/MoreLikeThis/MoreLikeThisBuilder";
import {
    MoreLikeThisUsingDocumentForDocumentQuery
} from "../Queries/MoreLikeThis/MoreLikeThisUsingDocumentForDocumentQuery";
import { SuggestionBase } from "../Queries/Suggestions/SuggestionBase";
import { ISuggestionDocumentQuery } from "../Queries/Suggestions/ISuggestionDocumentQuery";
import { ISuggestionBuilder } from "../Queries/Suggestions/ISuggestionBuilder";
import { SuggestionDocumentQuery } from "../Queries/Suggestions/SuggestionDocumentQuery";
import { SuggestionBuilder } from "../Queries/Suggestions/SuggestionBuilder";

export class DocumentQuery<T extends object>
    extends AbstractDocumentQuery<T, DocumentQuery<T>> implements IDocumentQuery<T> {

    public constructor(
        documentType: DocumentType<T>,
        session: InMemoryDocumentSessionOperations,
        indexName: string,
        collectionName: string,
        isGroupBy: boolean);
    public constructor(
        documentType: DocumentType<T>,
        session: InMemoryDocumentSessionOperations,
        indexName: string,
        collectionName: string,
        isGroupBy: boolean,
        declareToken: DeclareToken,
        loadTokens: LoadToken[],
        fromAlias: string);
    public constructor(
        documentType: DocumentType<T>,
        session: InMemoryDocumentSessionOperations,
        indexName: string,
        collectionName: string,
        isGroupBy: boolean,
        declareToken?: DeclareToken,
        loadTokens?: LoadToken[],
        fromAlias?: string) {
        super(documentType, session, indexName, collectionName, isGroupBy, declareToken, loadTokens, fromAlias);
    }

    //TODO: public <TProjection> IDocumentQuery<TProjection> selectFields(
    //    Class<TProjection> projectionClass, String... fields) {
    //     QueryData queryData = new QueryData(fields, fields);
    //     return selectFields(projectionClass, queryData);
    // }

    public selectFields<TProjection extends Object>(
        property: string): IDocumentQuery<TProjection>;
    public selectFields<TProjection extends object>(
        properties: string[]): IDocumentQuery<TProjection>;
    public selectFields<TProjection extends object>(
        queryData: QueryData,
        projectionType: DocumentType<TProjection>): IDocumentQuery<TProjection>;
    public selectFields<TProjection extends object>(
        property: string,
        projectionType: DocumentType<TProjection>): IDocumentQuery<TProjection>;
    public selectFields<TProjection extends object>(
        properties: string[],
        projectionType: DocumentType<TProjection>): IDocumentQuery<TProjection>;
    public selectFields<TProjection extends object>(
        propertiesOrQueryData: string | string[] | QueryData,
        projectionType?: DocumentType<TProjection>): IDocumentQuery<TProjection> {
        if (projectionType) {
            this._theSession.conventions.tryRegisterEntityType(projectionType);
        }

        if (TypeUtil.isString(propertiesOrQueryData)) {
            propertiesOrQueryData = [propertiesOrQueryData as string];
        }

        if (Array.isArray(propertiesOrQueryData)) {
            if (projectionType) {
                return this._selectFieldsByProjectionType(propertiesOrQueryData, projectionType);
            }

            const queryData = new QueryData(propertiesOrQueryData, propertiesOrQueryData);
            return this.selectFields(queryData, projectionType);
        } else {
            return this._createDocumentQueryInternal(projectionType, propertiesOrQueryData as QueryData);
        }
    }

    private _selectFieldsByProjectionType<TProjection extends object>(
        properties: string[], projectionType: DocumentType<TProjection>): IDocumentQuery<TProjection> {
        if (!properties || !properties.length) {
            throwError("InvalidArgumentException", "Fields cannot be null or empty.");
        }

        try {
            const projections = properties;
            const fields = properties.map(x => x);

            return this.selectFields(new QueryData(fields, projections), projectionType);
        } catch (err) {
            throwError("RavenException",
                "Unable to project to type: " + projectionType, err);
        }
    }

    public distinct(): IDocumentQuery<T> {
        this._distinct();
        return this;
    }

    public orderByScore(): IDocumentQuery<T> {
        this._orderByScore();
        return this;
    }

    public orderByScoreDescending(): IDocumentQuery<T> {
        this._orderByScoreDescending();
        return this;
    }

    // TBD 4.1 public IDocumentQuery<T> explainScores() {

    public waitForNonStaleResults(): IDocumentQuery<T>;
    public waitForNonStaleResults(waitTimeout: number): IDocumentQuery<T>;
    public waitForNonStaleResults(waitTimeout: number = null): IDocumentQuery<T> {
        this._waitForNonStaleResults(waitTimeout);
        return this;
    }

    public addParameter(name: string, value: any): IDocumentQuery<T> {
        super.addParameter(name, value);
        return this;
    }

    public addOrder(fieldName: string, descending: boolean): IDocumentQuery<T>;
    public addOrder(fieldName: string, descending: boolean, ordering: OrderingType): IDocumentQuery<T>;
    public addOrder(fieldName: string, descending: boolean, ordering: OrderingType = "String"): IDocumentQuery<T> {
        if (descending) {
            this.orderByDescending(fieldName, ordering);
        } else {
            this.orderBy(fieldName, ordering);
        }

        return this;
    }

    // tslint:disable-next-line:max-line-length
    // TBD public IDocumentQuery<T> AddOrder<TValue>(Expression<Func<T, TValue>> propertySelector, bool descending, OrderingType ordering)

    // TBD void IQueryBase<T, IDocumentQuery<T>>.AfterStreamExecuted(Action<BlittableJsonReaderObject> action)
    // TBD void IQueryBase<T, IRawDocumentQuery<T>>.AfterStreamExecuted(Action<BlittableJsonReaderObject> action)

    public openSubclause(): IDocumentQuery<T> {
        this._openSubclause();
        return this;
    }

    public closeSubclause(): IDocumentQuery<T> {
        this._closeSubclause();
        return this;
    }

    public search(fieldName: string, searchTerms: string): IDocumentQuery<T>;
    public search(fieldName: string, searchTerms: string, operator: SearchOperator): IDocumentQuery<T>;
    public search(fieldName: string, searchTerms: string, operator?: SearchOperator): IDocumentQuery<T> {
        this._search(fieldName, searchTerms, operator);
        return this;
    }

    // tslint:disable-next-line:max-line-length
    // TBD public IDocumentQuery<T> Search<TValue>(Expression<Func<T, TValue>> propertySelector, string searchTerms, SearchOperator @operator)

    public intersect(): IDocumentQuery<T> {
        this._intersect();
        return this;
    }

    public containsAny(fieldName: string, values: any[]): IDocumentQuery<T> {
        this._containsAny(fieldName, values);
        return this;
    }

    // tslint:disable-next-line:max-line-length
    // TBD public IDocumentQuery<T> ContainsAny<TValue>(Expression<Func<T, TValue>> propertySelector, IEnumerable<TValue> values)

    public containsAll(fieldName: string, values): IDocumentQuery<T> {
        this._containsAll(fieldName, values);
        return this;
    }

    // tslint:disable-next-line:max-line-length
    // TBD public IDocumentQuery<T> ContainsAll<TValue>(Expression<Func<T, TValue>> propertySelector, IEnumerable<TValue> values)

    public statistics(stats: (stats: QueryStatistics) => void): IDocumentQuery<T> {
        this._statistics(stats);
        return this;
    }

    public usingDefaultOperator(queryOperator: QueryOperator): IDocumentQuery<T> {
        this._usingDefaultOperator(queryOperator);
        return this;
    }

    public noTracking(): IDocumentQuery<T> {
        this._noTracking();
        return this;
    }

    public noCaching(): IDocumentQuery<T> {
        this._noCaching();
        return this;
    }

    // TBD 4.1 public IDocumentQuery<T> showTimings()

    public include(path: string): IDocumentQuery<T> {
        this._include(path);
        return this;
    }

    // TBD: IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.Include(Expression<Func<T, object>> path)

    public not(): IDocumentQuery<T> {
        this.negateNext();
        return this;
    }

    public take(count: number): IDocumentQuery<T> {
        this._take(count);
        return this;
    }

    public skip(count: number): IDocumentQuery<T> {
        this._skip(count);
        return this;
    }

    public whereLucene(fieldName: string, whereClause: string): IDocumentQuery<T>;
    public whereLucene(fieldName: string, whereClause: string, exact: boolean): IDocumentQuery<T>;
    public whereLucene(fieldName: string, whereClause: string, exact?: boolean): IDocumentQuery<T> {
        this._whereLucene(fieldName, whereClause, exact);
        return this;
    }

    public whereEquals(fieldName: string, method: MethodCall): IDocumentQuery<T>;
    public whereEquals(fieldName: string, method: MethodCall, exact: boolean): IDocumentQuery<T>;
    public whereEquals(fieldName: string, value: any): void;
    public whereEquals(fieldName: string, value: any, exact: boolean): IDocumentQuery<T>;
    public whereEquals(whereParams: WhereParams): IDocumentQuery<T>;
    public whereEquals(...args: any[]): IDocumentQuery<T> {
        (this._whereEquals as any)(...args as any[]);
        return this;
    }

    public whereNotEquals(fieldName: string, method: MethodCall): IDocumentQuery<T>;
    public whereNotEquals(fieldName: string, method: MethodCall, exact: boolean): IDocumentQuery<T>;
    public whereNotEquals(fieldName: string, value: any): void;
    public whereNotEquals(fieldName: string, value: any, exact: boolean): IDocumentQuery<T>;
    public whereNotEquals(whereParams: WhereParams): IDocumentQuery<T>;
    public whereNotEquals(...args: any[]): IDocumentQuery<T> {
        (this._whereNotEquals as any)(...args);
        return this;
    }

    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.WhereEquals<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact)
    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> IFilterDocumentQueryBase<T, IDocumentQuery<T>>.WhereEquals<TValue>(Expression<Func<T, TValue>> propertySelector, MethodCall value, bool exact)

    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.WhereNotEquals<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact)
    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> IFilterDocumentQueryBase<T, IDocumentQuery<T>>.WhereNotEquals<TValue>(Expression<Func<T, TValue>> propertySelector, MethodCall value, bool exact)

    public whereIn(fieldName: string, values: any[]): IDocumentQuery<T>;
    public whereIn(fieldName: string, values: any[], exact: boolean): IDocumentQuery<T>;
    public whereIn(...args: any[]): IDocumentQuery<T> {
        (this._whereIn as any)(...args);
        return this;
    }

    // TBD public IDocumentQuery<T> WhereIn<TValue>(Expression<Func<T, TValue>> propertySelector,
    // IEnumerable<TValue> values, bool exact = false)

    public whereStartsWith(fieldName: string, value: any): IDocumentQuery<T> {
        this._whereStartsWith(fieldName, value);
        return this;
    }

    public whereEndsWith(fieldName: string, value: any): IDocumentQuery<T> {
        this._whereEndsWith(fieldName, value);
        return this;
    }

    // TBD: public IDocumentQuery<T> WhereEndsWith<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value)

    public whereBetween(fieldName: string, start: any, end: any): IDocumentQuery<T>;
    public whereBetween(fieldName: string, start: any, end: any, exact: boolean): IDocumentQuery<T>;
    public whereBetween(...args: any[]): IDocumentQuery<T> {
        (this._whereBetween as any)(...args);
        return this;
    }

    public whereGreaterThan(fieldName: string, value: any): IDocumentQuery<T>;
    public whereGreaterThan(fieldName: string, value: any, exact: boolean): IDocumentQuery<T>;
    public whereGreaterThan(...args: any[]): IDocumentQuery<T> {
        (this._whereGreaterThan as any)(...args);
        return this;
    }

    // tslint:disable-next-line:max-line-length
    // TBD public IDocumentQuery<T> WhereBetween<TValue>(Expression<Func<T, TValue>> propertySelector, TValue start, TValue end, bool exact = false)

    public whereGreaterThanOrEqual(fieldName: string, value: any): IDocumentQuery<T>;
    public whereGreaterThanOrEqual(fieldName: string, value: any, exact: boolean): IDocumentQuery<T>;
    public whereGreaterThanOrEqual(...args: any[]): IDocumentQuery<T> {
        (this._whereGreaterThanOrEqual as any)(...args);
        return this;
    }

    public whereLessThan(fieldName: string, value: any): IDocumentQuery<T> ;
    public whereLessThan(fieldName: string, value: any, exact: boolean): IDocumentQuery<T>;
    public whereLessThan(...args: any[]): IDocumentQuery<T> {
        (this._whereLessThan as any)(...args);
        return this;
    }

    public whereLessThanOrEqual(fieldName: string, value: any): IDocumentQuery<T> ;
    public whereLessThanOrEqual(fieldName: string, value: any, exact: boolean): IDocumentQuery<T>;
    public whereLessThanOrEqual(...args: any[]): IDocumentQuery<T> {
        (this._whereLessThanOrEqual as any)(...args);
        return this;
    }

    // tslint:disable-next-line:max-line-length
    // TBD public IDocumentQuery<T> WhereGreaterThan<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false)
    // tslint:disable-next-line:max-line-length
    // TBD public IDocumentQuery<T> WhereGreaterThanOrEqual<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false)

    // tslint:disable-next-line:max-line-length
    // TBD public IDocumentQuery<T> WhereLessThanOrEqual<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false)

    // TBD public IDocumentQuery<T> WhereLessThanOrEqual<TValue>(
    //      Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false)
    // TBD public IDocumentQuery<T> WhereExists<TValue>(Expression<Func<T, TValue>> propertySelector)

    public whereExists(fieldName: string): IDocumentQuery<T> {
        this._whereExists(fieldName);
        return this;
    }

    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> IFilterDocumentQueryBase<T, IDocumentQuery<T>>.WhereRegex<TValue>(Expression<Func<T, TValue>> propertySelector, string pattern)

    public whereRegex(fieldName: string, pattern: string): IDocumentQuery<T> {
        this._whereRegex(fieldName, pattern);
        return this;
    }

    public andAlso(): IDocumentQuery<T> {
        this._andAlso();
        return this;
    }

    public orElse(): IDocumentQuery<T> {
        this._orElse();
        return this;
    }

    public boost(boost: number): IDocumentQuery<T> {
        this._boost(boost);
        return this;
    }

    public fuzzy(fuzzy: number): IDocumentQuery<T> {
        this._fuzzy(fuzzy);
        return this;
    }

    public proximity(proximity: number): IDocumentQuery<T> {
        this._proximity(proximity);
        return this;
    }

    public randomOrdering(): IDocumentQuery<T>;
    public randomOrdering(seed: string): IDocumentQuery<T>;
    public randomOrdering(seed?: string): IDocumentQuery<T> {
        this._randomOrdering(seed);
        return this;
    }

    // TBD 4.1 public IDocumentQuery<T> customSortUsing(String typeName, boolean descending)

    public groupBy(fieldName: string, ...fieldNames: string[]): IGroupByDocumentQuery<T>;
    public groupBy(field: GroupBy, ...fields: GroupBy[]): IGroupByDocumentQuery<T>;
    public groupBy(...args: any[]): IGroupByDocumentQuery<T> {
        (this._groupBy as any)(...args);

        return new GroupByDocumentQuery(this);
    }

    public ofType<TResult extends object>(tResultClass: DocumentType<TResult>): IDocumentQuery<TResult> {
        if (tResultClass) {
            this._theSession.conventions.tryRegisterEntityType(tResultClass);
        }

        return this._createDocumentQueryInternal(tResultClass);
    }

    public orderBy(field: string): IDocumentQuery<T>;
    public orderBy(field: string, ordering: OrderingType): IDocumentQuery<T>;
    public orderBy(...args: any[]): IDocumentQuery<T> {
        (this._orderBy as any)(...args);
        return this;
    }

    public orderByDescending(field: string): IDocumentQuery<T>;
    public orderByDescending(field: string, ordering: OrderingType): IDocumentQuery<T>;
    public orderByDescending(...args: any[]): IDocumentQuery<T> {
        (this._orderByDescending as any)(...args);
        return this;
    }

    // TBD public IDocumentQuery<T> OrderBy<TValue>(params Expression<Func<T, TValue>>[] propertySelectors)

    // TBD expr public IDocumentQuery<T> OrderByDescending<TValue>(
    //      params Expression<Func<T, TValue>>[] propertySelectors)

    private _createDocumentQueryInternal<TResult extends object>(
        resultClass: DocumentType<TResult>): DocumentQuery<TResult>;
    private _createDocumentQueryInternal<TResult extends object>(
        resultClass: DocumentType<TResult>, queryData: QueryData): DocumentQuery<TResult>;
    private _createDocumentQueryInternal<TResult extends object>(
        resultClass: DocumentType<TResult>, queryData?: QueryData): DocumentQuery<TResult> {
        let newFieldsToFetch: FieldsToFetchToken;

        if (queryData && queryData.fields.length > 0) {
            let { fields } = queryData;
            const identityProperty = this.conventions.getIdentityProperty(resultClass);

            if (identityProperty) {
                fields = queryData.fields.map(
                    p => p === identityProperty ? CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME : p);
            }

            let sourceAliasReference: string;
            DocumentQuery._getSourceAliasIfExists(resultClass, queryData, fields, s => sourceAliasReference = s);
            newFieldsToFetch = FieldsToFetchToken.create(fields, queryData.projections,
                queryData.isCustomFunction, sourceAliasReference);
        } else {
            newFieldsToFetch = null;
        }

        if (newFieldsToFetch) {
            this._updateFieldsToFetchToken(newFieldsToFetch);
        }

        const query = new DocumentQuery(
            resultClass,
            this._theSession,
            this.indexName,
            this.collectionName,
            this._isGroupBy,
            queryData ? queryData.declareToken : null,
            queryData ? queryData.loadTokens : null,
            queryData ? queryData.fromAlias : null);

        query._queryRaw = this._queryRaw;
        query._pageSize = this._pageSize;
        query._selectTokens = this._selectTokens;
        query.fieldsToFetchToken = this.fieldsToFetchToken;
        query._whereTokens = this._whereTokens;
        query._orderByTokens = this._orderByTokens;
        query._groupByTokens = this._groupByTokens;
        query._queryParameters = this._queryParameters;
        query._start = this._start;
        query._timeout = this._timeout;
        query._queryStats = this._queryStats;
        query._theWaitForNonStaleResults = this._theWaitForNonStaleResults;
        query._negate = this._negate;
        //noinspection unchecked
        query._includes = new Set(this._includes);
        query._rootTypes = new Set([this._clazz]);

        for (const listener of query.listeners("beforeQuery")) {
            query.on("beforeQuery", listener as any);
        }

        for (const listener of query.listeners("afterQuery")) {
            query.on("afterQuery", listener as any);
        }

        /* TODO AfterStreamExecutedCallback = AfterStreamExecutedCallback, should it be implemented?
        for: 4.1: query.HighlightedFields = new List<HighlightedField>(HighlightedFields),
        query.HighlighterPreTags = HighlighterPreTags,
        query.HighlighterPostTags = HighlighterPostTags,
        */
        query._disableEntitiesTracking = this._disableEntitiesTracking;
        query._disableCaching = this._disableCaching;
        // TBD ShowQueryTimings = ShowQueryTimings,
        // TBD query.shouldExplainScores = shouldExplainScores;
        query._isIntersect = this._isIntersect;
        query._defaultOperator = this._defaultOperator;

        return query;
    }

    public aggregateBy(builder: (facetBuilder: IFacetBuilder<T>) => void): IAggregationDocumentQuery<T>;
    public aggregateBy(facet: FacetBase): IAggregationDocumentQuery<T>;
    public aggregateBy(...facets: Facet[]): IAggregationDocumentQuery<T>;
    public aggregateBy(
        facetOrFacetBuilder: Facet | FacetBase | ((facetBuilder: IFacetBuilder<T>) => void),
        ...facets: Facet[]): IAggregationDocumentQuery<T> {

        if (TypeUtil.isNullOrUndefined(facetOrFacetBuilder)) {
            throwError("InvalidArgumentException", "Facet or facet builder cannot be null.");
        }

        const argType = typeof facetOrFacetBuilder;
        if (argType === "function") {
            const ff = new FacetBuilder<T>();
            (facetOrFacetBuilder as ((facetBuilder: IFacetBuilder<T>) => void))(ff);
            return this.aggregateBy(ff.getFacet());
        }

        for (const facet of [facetOrFacetBuilder as FacetBase, ...facets]) {
            this._aggregateBy(facet);
        }

        return new AggregationDocumentQuery<T>(this);
    }

    public aggregateUsing(facetSetupDocumentId: string): IAggregationDocumentQuery<T> {
        this._aggregateUsing(facetSetupDocumentId);
        return new AggregationDocumentQuery<T>(this);
    }

    // tslint:disable:max-line-length
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.Highlight(string fieldName, int fragmentLength, int fragmentCount, string fragmentsField)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.Highlight(string fieldName, int fragmentLength, int fragmentCount, out FieldHighlightings highlightings)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.Highlight(string fieldName,string fieldKeyName, int fragmentLength,int fragmentCount,out FieldHighlightings highlightings)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.Highlight<TValue>(Expression<Func<T, TValue>> propertySelector, int fragmentLength, int fragmentCount, Expression<Func<T, IEnumerable>> fragmentsPropertySelector)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.Highlight<TValue>(Expression<Func<T, TValue>> propertySelector, int fragmentLength, int fragmentCount, out FieldHighlightings fieldHighlightings)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.Highlight<TValue>(Expression<Func<T, TValue>> propertySelector, Expression<Func<T, TValue>> keyPropertySelector, int fragmentLength, int fragmentCount, out FieldHighlightings fieldHighlightings)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.SetHighlighterTags(string preTag, string postTag)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.SetHighlighterTags(string[] preTags, string[] postTags)
    // TBD expr public IDocumentQuery<T> Spatial(Expression<Func<T, object>> path, Func<SpatialCriteriaFactory, SpatialCriteria> clause)
    // tslint:enable:max-line-length

    public spatial(
        fieldName: string,
        clause: (factory: SpatialCriteriaFactory) => SpatialCriteria): IDocumentQuery<T>;
    public spatial(
        field: DynamicSpatialField,
        clause: (factory: SpatialCriteriaFactory) => SpatialCriteria): IDocumentQuery<T>;
    public spatial(
        fieldNameOrField: string | DynamicSpatialField,
        clause: (factory: SpatialCriteriaFactory) => SpatialCriteria): IDocumentQuery<T> {
        const criteria = clause(SpatialCriteriaFactory.INSTANCE);
        this._spatial(fieldNameOrField as any, criteria);
        return this;
    }

    // tslint:disable-next-line:max-line-length
    // TBD public IDocumentQuery<T> Spatial(Func<SpatialDynamicFieldFactory<T>, DynamicSpatialField> field, Func<SpatialCriteriaFactory, SpatialCriteria> clause)
    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.WithinRadiusOf<TValue>(Expression<Func<T, TValue>> propertySelector, double radius, double latitude, double longitude, SpatialUnits? radiusUnits, double distanceErrorPct)

    /**
     * Filter matches to be inside the specified radius
     */
    public withinRadiusOf(
        fieldName: string, radius: number, latitude: number, longitude: number): IDocumentQuery<T>;
    /**
     * Filter matches to be inside the specified radius
     */
    public withinRadiusOf(
        fieldName: string,
        radius: number,
        latitude: number,
        longitude: number,
        radiusUnits: SpatialUnits): IDocumentQuery<T>;
    /**
     * Filter matches to be inside the specified radius
     */
    public withinRadiusOf(
        fieldName: string,
        radius: number,
        latitude: number,
        longitude: number,
        radiusUnits: SpatialUnits,
        distanceErrorPct: number): IDocumentQuery<T>;
    /**
     * Filter matches to be inside the specified radius
     */
    public withinRadiusOf(
        fieldName: string,
        radius: number,
        latitude: number,
        longitude: number,
        radiusUnits: SpatialUnits = null,
        distanceErrorPct: number = CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT): IDocumentQuery<T> {
        this._withinRadiusOf(fieldName, radius, latitude, longitude, radiusUnits, distanceErrorPct);
        return this;
    }

    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.RelatesToShape<TValue>(Expression<Func<T, TValue>> propertySelector, string shapeWkt, SpatialRelation relation, double distanceErrorPct)

    public relatesToShape(
        fieldName: string, shapeWkt: string, relation: SpatialRelation): IDocumentQuery<T>;
    public relatesToShape(
        fieldName: string, shapeWkt: string, relation: SpatialRelation, distanceErrorPct: number): IDocumentQuery<T>;
    public relatesToShape(
        fieldName: string,
        shapeWkt: string,
        relation: SpatialRelation,
        distanceErrorPct: number = CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT): IDocumentQuery<T> {
        this._spatialByShapeWkt(fieldName, shapeWkt, relation, distanceErrorPct);
        return this;
    }

    public orderByDistance(field: DynamicSpatialField, latitude: number, longitude: number): IDocumentQuery<T>;
    public orderByDistance(field: DynamicSpatialField, shapeWkt: string): IDocumentQuery<T>;
    public orderByDistance(fieldName: string, latitude: number, longitude: number): IDocumentQuery<T>;
    public orderByDistance(fieldName: string, shapeWkt: string): IDocumentQuery<T>;
    public orderByDistance(...args: any[]): IDocumentQuery<T> {
        (this._orderByDistance as any)(...args);
        return this;
    }

    public orderByDistanceDescending(
        field: DynamicSpatialField, latitude: number, longitude: number): IDocumentQuery<T>;
    public orderByDistanceDescending(field: DynamicSpatialField, shapeWkt: string): IDocumentQuery<T>;
    public orderByDistanceDescending(fieldName: string, latitude: number, longitude: number): IDocumentQuery<T>;
    public orderByDistanceDescending(fieldName: string, shapeWkt: string): IDocumentQuery<T>;
    public orderByDistanceDescending(...args: any[]): IDocumentQuery<T> {
        (this._orderByDistanceDescending as any)(...args);
        return this;
    }

    // tslint:disable:max-line-length
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.OrderByDistance(Func<DynamicSpatialFieldFactory<T>, DynamicSpatialField> field, double latitude, double longitude)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.OrderByDistance(Func<DynamicSpatialFieldFactory<T>, DynamicSpatialField> field, string shapeWkt)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.OrderByDistance<TValue>(Expression<Func<T, TValue>> propertySelector, double latitude, double longitude)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.OrderByDistance<TValue>(Expression<Func<T, TValue>> propertySelector, string shapeWkt)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.OrderByDistanceDescending(Func<DynamicSpatialFieldFactory<T>, DynamicSpatialField> field, double latitude, double longitude)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.OrderByDistanceDescending(Func<DynamicSpatialFieldFactory<T>, DynamicSpatialField> field, string shapeWkt)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.OrderByDistanceDescending<TValue>(Expression<Func<T, TValue>> propertySelector, double latitude, double longitude)
    // TBD IDocumentQuery<T> IDocumentQueryBase<T, IDocumentQuery<T>>.OrderByDistanceDescending<TValue>(Expression<Func<T, TValue>> propertySelector, string shapeWkt)
    // tslint:enable:max-line-length

    public moreLikeThis(
        builder: (moreLikeThisBuilder: IMoreLikeThisBuilderForDocumentQuery<T>) => void): IDocumentQuery<T>;
    public moreLikeThis(moreLikeThis: MoreLikeThisBase): IDocumentQuery<T>;
    public moreLikeThis(
        moreLikeThisBaseOrBuilder:
            MoreLikeThisBase
            | ((moreLikeThisBuilder: IMoreLikeThisBuilderForDocumentQuery<T>) => void)): IDocumentQuery<T> {
        if (moreLikeThisBaseOrBuilder instanceof MoreLikeThisBase) {
            const mlt = this._moreLikeThis();

            try {
                mlt.withOptions(moreLikeThisBaseOrBuilder.options);

                if (moreLikeThisBaseOrBuilder instanceof MoreLikeThisUsingDocument) {
                    mlt.withDocument(moreLikeThisBaseOrBuilder.documentJson);
                }
            } finally {
                mlt.dispose();
            }
        } else {
            const f = new MoreLikeThisBuilder<T>();
            moreLikeThisBaseOrBuilder(f);

            const moreLikeThis = this._moreLikeThis();
            try {
                moreLikeThis.withOptions(f.getMoreLikeThis().options);

                const innerMoreLikeThis = f.getMoreLikeThis();

                if (innerMoreLikeThis instanceof MoreLikeThisUsingDocument) {
                    moreLikeThis.withDocument(innerMoreLikeThis.documentJson);
                } else if (innerMoreLikeThis instanceof MoreLikeThisUsingDocumentForDocumentQuery) {
                    innerMoreLikeThis.forDocumentQuery(this);
                }
            } finally {
                moreLikeThis.dispose();
            }
        }

        return this;
    }

    public suggestUsing(suggestion: SuggestionBase): ISuggestionDocumentQuery<T>;
    public suggestUsing(action: (builder: ISuggestionBuilder<T>) => void): ISuggestionDocumentQuery<T>;
    public suggestUsing(suggestBaseOrBuilder:
                            SuggestionBase
                            | ((builder: ISuggestionBuilder<T>) => void)): ISuggestionDocumentQuery<T> {

        if (suggestBaseOrBuilder instanceof SuggestionBase) {
            this._suggestUsing(suggestBaseOrBuilder);
            return new SuggestionDocumentQuery<T>(this);
        } else {
            const f = new SuggestionBuilder<T>();
            suggestBaseOrBuilder(f);

            this.suggestUsing(f.suggestion);

            return new SuggestionDocumentQuery<T>(this);
        }
    }
}
