import {IQueryBuilder} from "./IQueryBuilder";
import {FieldConstants, OrderingType, QueryKeywords, QueryOperator} from "./QueryLanguage";
import {SearchOperator} from "./QueryLanguage";
import {SpartialCriteria} from "./Spartial/SpartialCriteria";
import {LinkedList} from "../../../Utility/LinkedList";
import {QueryToken} from "./Tokens/QueryToken";
import {FromToken} from "./Tokens/FromToken";
import {FieldsToFetchToken} from "./Tokens/FieldsToFetchToken";
import {ArgumentOutOfRangeException, InvalidOperationException} from "../../../Database/DatabaseExceptions";
import {TypeUtil} from "../../../Utility/TypeUtil";
import {OrderByToken} from "./Tokens/OrderByToken";
import {Observable} from "../../../Utility/Observable";
import {StringUtil} from "../../../Utility/StringUtil";
import {GroupByToken} from "./Tokens/GroupByToken";
import {IParametrizedWhereParams} from "./IWhereParams";
import {WhereToken} from "./Tokens/WhereToken";
import {CloseSubclauseToken} from "./Tokens/CloseSubclauseToken";
import {QueryOperatorToken} from "./Tokens/QueryOperatorToken";
import {OpenSubclauseToken} from "./Tokens/OpenSubclauseToken";
import {NegateToken} from "./Tokens/NegateToken";
import {TrueToken} from "./Tokens/TrueToken";
import {IntersectMarkerToken} from "./Tokens/IntersectMarkerToken";
import {SpartialRelations} from "./Spartial/SpartialRelation";

export interface IFieldValidationResult {
  originalFieldName: string;
  escapedFieldName: string;
}

export class QueryBuilder extends Observable implements IQueryBuilder {
  public static readonly VALIDATE_FIELD = 'VALIDATE_FIELD';

  protected selectTokens: LinkedList<QueryToken>;
  protected fromToken: FromToken;
  protected fieldsToFetchToken: FieldsToFetchToken;
  protected whereTokens: LinkedList<QueryToken>;
  protected groupByTokens: LinkedList<QueryToken>;
  protected orderByTokens: LinkedList<QueryToken>;
  protected defaultOperator: QueryOperator = null;
  protected idPropertyName?: string = null;
  protected includes: Set<string>;
  protected queryRaw?: string = null;
  protected isGroupBy: boolean = false;
  protected negate: boolean = false;
  protected currentClauseDepth: number = 0;

  constructor(indexName?: string, collectionName?: string, idPropertyName?: string) {
    super();

    if (indexName || collectionName) {
      this.from(indexName, collectionName);
    }

    this.selectTokens = new LinkedList<QueryToken>();
    this.whereTokens = new LinkedList<QueryToken>();
    this.groupByTokens = new LinkedList<QueryToken>();
    this.orderByTokens = new LinkedList<QueryToken>();
    this.includes = new Set<string>();
    this.idPropertyName = idPropertyName;
  }

  public usingDefaultOperator(operator: QueryOperator): IQueryBuilder {
    if (this.whereTokens.count) {
      throw new InvalidOperationException("Default operator can only be set \
before any where clause is added.");
    }

    this.defaultOperator = operator;

    return this;
  }

  public rawQuery(query: string): IQueryBuilder {
     if ([this.selectTokens, this.whereTokens,
         this.orderByTokens, this.groupByTokens]
         .some((list: LinkedList<QueryToken>)
         : boolean => !!list.count)
     ) {
       throw new InvalidOperationException("You can only use RawQuery on a new query, \
without applying any operations (such as Where, Select, OrderBy, GroupBy, etc)");
     }

    this.queryRaw = query;
    return this;
  }

  public from(indexName?: string, collectionName?: string): IQueryBuilder {
    this.fromToken = FromToken.create(indexName, collectionName);

    return this;
  }

  public getProjectionFields(): string[] {
    if (this.fieldsToFetchToken) {
      return this.fieldsToFetchToken.projections || [];
    }

    return [];
  }

  public randomOrdering(seed?: string): IQueryBuilder {
    this.assertNoRawQuery();
    this.orderByTokens.addLast(seed
      ? OrderByToken.createRandom(seed)
      : OrderByToken.random
    );

    return this;
  }

  public customSortUsing(typeName: string, descending: boolean = false): IQueryBuilder {
    const fieldName: string = `${FieldConstants.CustomSortFieldName};${typeName}`;

    return descending
      ? this.orderByDescending(fieldName)
      : this.orderBy(fieldName);
  }

  public include(path: string): IQueryBuilder {
    this.includes.add(path);

    return this;
  }

  public whereEquals(params: IParametrizedWhereParams): IQueryBuilder;
  public whereEquals(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder;
  public whereEquals(fieldNameOrParams: string | IParametrizedWhereParams, parameterName?: string, exact: boolean = false): IQueryBuilder {
    const fieldName: string = <string>fieldNameOrParams;
    const params: IParametrizedWhereParams = <IParametrizedWhereParams>fieldNameOrParams;

    if (TypeUtil.isString(fieldNameOrParams)) {
      return this.whereEquals({
        parameterName,
        fieldName, exact
      });
    }

    if (this.negate) {
      this.negate = false;
      return this.whereNotEquals(params);
    }

    params.fieldName = this.ensureValidFieldName(params.fieldName, params.isNestedPath);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.whereTokens.addLast(WhereToken.equals(params.fieldName, params.parameterName, params.exact));

    return this;
  }

  public whereNotEquals(params: IParametrizedWhereParams): IQueryBuilder;
  public whereNotEquals(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder;
  public whereNotEquals(fieldNameOrParams: string | IParametrizedWhereParams, parameterName: string, exact: boolean = false): IQueryBuilder {
    const fieldName: string = <string>fieldNameOrParams;
    const params: IParametrizedWhereParams = <IParametrizedWhereParams>fieldNameOrParams;

    if (TypeUtil.isString(fieldNameOrParams)) {
      return this.whereNotEquals({
        parameterName,
        fieldName, exact
      });
    }

    if (this.negate) {
      this.negate = false;
      return this.whereEquals(params);
    }

    params.fieldName = this.ensureValidFieldName(params.fieldName, params.isNestedPath);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.whereTokens.addLast(WhereToken.notEquals(params.fieldName, params.parameterName, params.exact));

    return this;
  }

  public openSubclause(): IQueryBuilder {
    this.currentClauseDepth++;
    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded();
    this.whereTokens.addLast(OpenSubclauseToken.instance);

    return this;
  }

  public closeSubclause(): IQueryBuilder {
    this.currentClauseDepth--;
    this.whereTokens.addLast(CloseSubclauseToken.instance);

    return this;
  }

  public negateNext(): IQueryBuilder {
    this.negate = !this.negate;

    return this;
  }

  public whereIn(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.in(fieldName, parameterName, exact));

    return this;
  }

  public whereStartsWith(fieldName: string, parameterName: string): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.startsWith(fieldName, parameterName));

    return this;
  }

  public whereEndsWith(fieldName: string, parameterName: string): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.endsWith(fieldName, parameterName));

    return this;
  }

  public whereBetween(fieldName: string, fromParameterName: string, toParameterName: string, exact: boolean = false): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.between(fieldName, fromParameterName, toParameterName, exact));

    return this;
  }

  public whereGreaterThan(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.greaterThan(fieldName, parameterName, exact));

    return this;
  }

  public whereGreaterThanOrEqual(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.greaterThanOrEqual(fieldName, parameterName, exact));

    return this;
  }

  public whereLessThanOrEqual(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.lessThanOrEqual(fieldName, parameterName, exact));

    return this;
  }

  public whereLessThan(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.lessThan(fieldName, parameterName, exact));

    return this;
  }

  public whereExists(fieldName: string): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.exists(fieldName));

    return this;
  }

  public andAlso(): IQueryBuilder {

    if (this.whereTokens.last === null) {

      return this;

    }

    if (this.whereTokens.last.value instanceof QueryOperatorToken) {
      throw new InvalidOperationException("Cannot add AND, previous token was already an operator token.");
    }

    this.whereTokens.addLast(QueryOperatorToken.And);

    return this;
  }

  public orElse(): IQueryBuilder {

    if (this.whereTokens.last === null) {

      return this;

    }

    if (this.whereTokens.last.value instanceof QueryOperatorToken) {
      throw new InvalidOperationException("Cannot add OR, previous token was already an operator token.");
    }

    this.whereTokens.addLast(QueryOperatorToken.Or);

    return this;
  }

  //+
  public boost(boost: number): IQueryBuilder {

    if (boost == 1) {
      return this;
    }

    let whereToken = this.whereTokens.last.value;

    if (!(whereToken instanceof WhereToken)) {
      whereToken = null;
    }

    if (whereToken == null) {
      throw new InvalidOperationException("Missing where clause");
    }

    if (boost <= 0) {
      throw new ArgumentOutOfRangeException("Boost factor must be a positive number");
    }

    WhereToken.boost = boost;

    return this;
  }

  public fuzzy(fuzzy: number): IQueryBuilder {

    let whereToken = this.whereTokens.last.value;

    if (!(whereToken instanceof WhereToken)) {
      whereToken = null;
    }

    if (whereToken == null) {
      throw new InvalidOperationException("Missing where clause");
    }

    if (fuzzy < 0 || fuzzy > 1) {
      throw new ArgumentOutOfRangeException("Fuzzy distance must be between 0.0 and 1.0");
    }

    WhereToken.fuzzy = fuzzy;

    return this;
  }

  public proximity(proximity: number): IQueryBuilder {

    let whereToken = this.whereTokens.last.value;

    if (!(whereToken instanceof WhereToken)) {
      whereToken = null;
    }

    if (whereToken == null) {
      throw new InvalidOperationException("Missing where clause");
    }

    if (proximity < 1) {
      throw new ArgumentOutOfRangeException("Proximity distance must be a positive number");
    }

    WhereToken.proximity = proximity;

    return this;
  }

  public orderBy(field: string, ordering?: OrderingType): IQueryBuilder {

    this.assertNoRawQuery();
    field = this.ensureValidFieldName(field);
    this.orderByTokens.addLast(OrderByToken.createAscending(field, ordering));

    return this;
  }

  public orderByDescending(field: string, ordering?: OrderingType): IQueryBuilder {

    this.assertNoRawQuery();
    field = this.ensureValidFieldName(field);
    this.orderByTokens.addLast(OrderByToken.createDescending(field, ordering));

    return this;
  }

  public orderByScore(): IQueryBuilder {

    this.assertNoRawQuery();
    this.orderByTokens.addLast(OrderByToken.scoreAscending);

    return this;
  }

  public orderByScoreDescending(): IQueryBuilder {

    this.assertNoRawQuery();
    this.orderByTokens.addLast(OrderByToken.scoreDescending);

    return this;
  }

  public search(fieldName: string, searchTerms: string, operator: SearchOperator): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    // let hasWhiteSpace = searchTerms.Any(char.IsWhiteSpace);
    //
    // LastEquality = new KeyValuePair<string, object>(fieldName,
    //   hasWhiteSpace ? "(" + searchTerms + ")" : searchTerms
    // );

    this.whereTokens.addLast(WhereToken.search(fieldName, searchTerms, operator));

    return this;
  }

  //+??? IsIntersect = true;
  public intersect(): IQueryBuilder {

    let last = this.whereTokens.last.value;

    if (!(last instanceof WhereToken)) {
      last = null;
    }

    if (last instanceof WhereToken || last instanceof CloseSubclauseToken) {

      SpartialRelations.Intersects; //??? IsIntersect = true;

      this.whereTokens.addLast(IntersectMarkerToken.Instance);
    }
    else {
      throw new InvalidOperationException("Cannot add INTERSECT at this point.");
    }
      return this;
    }

  //??? addFirst
  public distinct(): IQueryBuilder {

    if (QueryKeywords.Distinct) {
      throw new InvalidOperationException("This is already a distinct query.");
    }

    this.selectTokens.addFirst(DistinctToken.Instance);

    return this;
  }

  //+?
  public containsAny(fieldName: string, parameterName: string): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    // var array = TransformEnumerable(fieldName, UnpackEnumerable(values))
    //   .ToArray();

    if (fieldName.length == 0)
    {
      this.whereTokens.addLast(TrueToken.instance);
      return this;
    }

    this.whereTokens.addLast(WhereToken.in(fieldName, parameterName, false));

    return this;
  }

  //+?
  public containsAll(fieldName: string, parameterName: string): IQueryBuilder {

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    // var array = TransformEnumerable(fieldName, UnpackEnumerable(values))
    //   .ToArray();

    if (fieldName.length == 0)
    {
      this.whereTokens.addLast(TrueToken.instance);
      return this;
    }

    this.whereTokens.addLast(WhereToken.allIn(fieldName, parameterName));

    return this;
  }

  public groupBy(fieldName: string, ...fieldNames: string[]): IQueryBuilder {
    if (!this.fromToken.isDynamic) {
      throw new InvalidOperationException("GroupBy only works with dynamic queries.");
    }

    this.assertNoRawQuery();
    this.isGroupBy = true;

    [fieldName].concat(fieldNames).forEach((field: string): void => {
      field = this.ensureValidFieldName(field);
      this.groupByTokens.addLast(GroupByToken.create(field));
    });


    return this;
  }

  //?
  public groupByKey(fieldName: string, projectedName?: string): IQueryBuilder {

    this.assertNoRawQuery();
    this.isGroupBy = true;

    // if (projectedName != null && _aliasToGroupByFieldName.TryGetValue(projectedName, out var aliasedFieldName))
    // {
    //   if (fieldName == null || fieldName.Equals(projectedName, StringComparison.Ordinal))
    //     fieldName = aliasedFieldName;
    // }

    this.selectTokens.addLast(GroupByToken.create(fieldName, projectedName));

    return this;
  }

  public groupBySum(fieldName: string, projectedName?: string): IQueryBuilder {

    this.assertNoRawQuery();
    this.isGroupBy = true;

    fieldName = this.ensureValidFieldName(fieldName);

    this.selectTokens.addLast(GroupByToken.create(fieldName));

    return this;
  }

  public groupByCount(projectedName?: string): IQueryBuilder {

    this.assertNoRawQuery();

    this.isGroupBy = true;

    this.selectTokens.addLast(GroupByToken.create(projectedName));

    return this;
  }

  public whereTrue(): IQueryBuilder {

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded();

    this.whereTokens.addLast(TrueToken.instance);

    return this;
  }

  public spatial(fieldName: string, criteria: SpartialCriteria): IQueryBuilder {
    return this;
  }

  public orderByDistance(fieldName: string, shapeWkt: string): IQueryBuilder;
  public orderByDistance(fieldName: string, latitude: number, longitude: number): IQueryBuilder;
  public orderByDistance(fieldName: string, latitudeOrShapeWkt: number | string, longitude?: number): IQueryBuilder {
    return this;
  }

  public orderByDistanceDescending(fieldName: string, shapeWkt: string): IQueryBuilder;
  public orderByDistanceDescending(fieldName: string, latitude: number, longitude: number): IQueryBuilder;
  public orderByDistanceDescending(fieldName: string, latitudeOrShapeWkt: number | string, longitude?: number): IQueryBuilder {
    return this;
  }

  protected assertNoRawQuery(): void {
    if (!TypeUtil.isNone(this.queryRaw)) {
      throw new InvalidOperationException(
        "RawQuery was called, cannot modify this query by calling on operations that \
would modify the query (such as Where, Select, OrderBy, GroupBy, etc)"
      );
    }
  }

  protected ensureValidFieldName(fieldName: string, isNestedPath: boolean = false): string {
    const {VALIDATE_FIELD} = <typeof QueryBuilder>this.constructor;

    let result: IFieldValidationResult = {
      originalFieldName: fieldName,
      escapedFieldName: StringUtil.escapeIfNecessary(fieldName)
    };

    if (!this.isGroupBy && !isNestedPath) {
      if (!TypeUtil.isNone(this.idPropertyName) && (fieldName === this.idPropertyName)) {
        result.escapedFieldName = FieldConstants.DocumentIdFieldName;
      }

      this.emit<IFieldValidationResult>(VALIDATE_FIELD, result);
    }

    return result.escapedFieldName;
  }

  protected appendOperatorIfNeeded(tokens: LinkedList<QueryToken>): void {
    this.assertNoRawQuery();

    if (!tokens.count) {
      return;
    }

    const lastToken: QueryToken = tokens.last.value;

    if (!(lastToken instanceof WhereToken) && !(lastToken instanceof CloseSubclauseToken)) {
      return;
    }

    let current = tokens.last;
    let lastWhere: WhereToken = null;

    while (!TypeUtil.isNone(current)) {
      if (current.value instanceof WhereToken) {
        lastWhere = current.value;
        break;
      }

      current = current.previous;
    }

    let token: QueryOperatorToken = (QueryOperator.AND === this.defaultOperator)
        ? QueryOperatorToken.And : QueryOperatorToken.Or;

    if (lastWhere && !TypeUtil.isNone(lastWhere.searchOperator)) {
      token = QueryOperatorToken.Or;
    }

    tokens.addLast(token);
  }

  protected negateIfNeeded(fieldName?: string): void {
    if (!this.negate) {
      return;
    }

    this.negate = false;

    if (!this.whereTokens.count || (this.whereTokens.last.value instanceof OpenSubclauseToken)) {
      TypeUtil.isNone(fieldName)
        ? this.whereTrue()
        : this.whereExists(fieldName);

      this.andAlso();
    }

    this.whereTokens.addLast(NegateToken.instance);
  }

}