import {IQueryBuilder} from "./IQueryBuilder";
import {FieldConstants, OrderingType, QueryKeywords, QueryOperator, SearchOperators} from "./QueryLanguage";
import {SearchOperator} from "./QueryLanguage";
import {SpatialCriteria, SpatialParameterNameGenerator} from "./Spatial/SpatialCriteria";
import {LinkedList, LinkedListItem} from "../../../Utility/LinkedList";
import {QueryToken, IQueryToken} from "./Tokens/QueryToken";
import {FromToken} from "./Tokens/FromToken";
import {FieldsToFetchToken} from "./Tokens/FieldsToFetchToken";
import {ArgumentOutOfRangeException, InvalidOperationException} from "../../../Database/DatabaseExceptions";
import {TypeUtil} from "../../../Utility/TypeUtil";
import {OrderByToken} from "./Tokens/OrderByToken";
import {Observable} from "../../../Utility/Observable";
import {StringUtil} from "../../../Utility/StringUtil";
import {GroupByToken} from "./Tokens/GroupByToken";
import {IParametrizedWhereParams} from "./WhereParams";
import {WhereToken} from "./Tokens/WhereToken";
import {CloseSubclauseToken} from "./Tokens/CloseSubclauseToken";
import {QueryOperatorToken} from "./Tokens/QueryOperatorToken";
import {OpenSubclauseToken} from "./Tokens/OpenSubclauseToken";
import {NegateToken} from "./Tokens/NegateToken";
import {TrueToken} from "./Tokens/TrueToken";
import {IntersectMarkerToken} from "./Tokens/IntersectMarkerToken";
import {SpatialRelation, SpatialRelations} from "./Spatial/SpatialRelation";
import {DistinctToken} from "./Tokens/DistinctToken";
import {StringBuilder} from "../../../Utility/StringBuilder";
import {GroupBySumToken} from "./Tokens/GroupBySumToken";
import {GroupByCountToken} from "./Tokens/GroupByCountToken";
import {GroupByKeyToken} from "./Tokens/GroupByKeyToken";
import {SpatialUnit, SpatialUnits} from "./Spatial/SpatialUnit";
import {SpatialConstants} from "./Spatial/SpatialConstants";
import {ShapeToken} from "./Tokens/ShapeToken";
import {WktCriteria} from "./Spatial/WktCriteria";

export interface IFieldValidationResult {
  originalFieldName: string;
  escapedFieldName: string;
}

export class QueryBuilder extends Observable implements IQueryBuilder {
  public static readonly VALIDATE_FIELD = 'VALIDATE_FIELD';

  protected selectTokens: LinkedList<IQueryToken>;
  protected fromToken: FromToken;
  protected groupByTokens: LinkedList<IQueryToken>;
  protected orderByTokens: LinkedList<IQueryToken>;
  protected fieldsToFetchToken: FieldsToFetchToken;
  protected whereTokens: LinkedList<IQueryToken>;
  protected aliasToGroupByFieldName: Map<string, string>;
  protected defaultOperator: QueryOperator = null;
  protected idPropertyName?: string = null;
  protected includes: Set<string>;
  protected queryRaw?: string = null;
  protected isGroupBy: boolean = false;
  protected isIntersect: boolean = false;
  protected isDistinct: boolean = false;
  protected negate: boolean = false;
  protected currentClauseDepth: number = 0;

  constructor(indexName?: string, collectionName?: string, idPropertyName?: string) {
    super();

    if (indexName || collectionName) {
      this.from(indexName, collectionName);
    }

    this.groupByTokens = new LinkedList<IQueryToken>();
    this.orderByTokens = new LinkedList<IQueryToken>();
    this.selectTokens = new LinkedList<IQueryToken>();
    this.whereTokens = new LinkedList<IQueryToken>();
    this.aliasToGroupByFieldName = new Map<string, string>();
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
        .some((list: LinkedList<IQueryToken>): boolean => !!list.count)
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

  public addGroupByAlias(fieldName: string, projectedName: string ): void {
    this.aliasToGroupByFieldName.set(projectedName, fieldName);
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
  public whereEquals(fieldName: string, parameterName: string, exact?: boolean): IQueryBuilder;
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
  public whereNotEquals(fieldName: string, parameterName: string, exact?: boolean): IQueryBuilder;
  public whereNotEquals(fieldNameOrParams: string | IParametrizedWhereParams, parameterName?: string, exact: boolean = false): IQueryBuilder {
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
    this.whereTokens.addLast(<QueryToken>OpenSubclauseToken.instance);

    return this;
  }

  public closeSubclause(): IQueryBuilder {
    this.currentClauseDepth--;
    this.whereTokens.addLast(<QueryToken>CloseSubclauseToken.instance);

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

  public whereAllIn(fieldName: string, parameterName: string): IQueryBuilder {
    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.allIn(fieldName, parameterName));

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
    if (TypeUtil.isNull(this.whereTokens.last)) {
      return this;
    }

    if (this.whereTokens.last.value instanceof QueryOperatorToken) {
      throw new InvalidOperationException("Cannot add AND, previous token was already an operator token.");
    }

    this.whereTokens.addLast(QueryOperatorToken.And);

    return this;
  }

  public orElse(): IQueryBuilder {
    if (TypeUtil.isNull(this.whereTokens.last)) {
      return this;
    }

    if (this.whereTokens.last.value instanceof QueryOperatorToken) {
      throw new InvalidOperationException("Cannot add OR, previous token was already an operator token.");
    }

    this.whereTokens.addLast(QueryOperatorToken.Or);

    return this;
  }

  public boost(boost: number): IQueryBuilder {
    let lastToken: LinkedListItem<IQueryToken>;
    let whereToken: WhereToken;

    if (1 === boost) {
      return this;
    }

    if (!(lastToken = this.whereTokens.last) 
      && !((whereToken = <WhereToken>lastToken.value) instanceof WhereToken)
    ) {
      throw new InvalidOperationException("Missing where clause");
    }

    if (boost <= 0) {
      throw new ArgumentOutOfRangeException("Boost factor must be a positive number");
    }

    whereToken.boost = boost;

    return this;
  }

  public fuzzy(fuzzy: number): IQueryBuilder {
    let lastToken: LinkedListItem<IQueryToken>;
    let whereToken: WhereToken;

    if (!(lastToken = this.whereTokens.last) 
      && !((whereToken = <WhereToken>lastToken.value) instanceof WhereToken)
    ) {
      throw new InvalidOperationException("Missing where clause");
    }

    if ((fuzzy < 0) || (fuzzy > 1)) {
      throw new ArgumentOutOfRangeException("Fuzzy distance must be between 0.0 and 1.0");
    }

    whereToken.fuzzy = fuzzy;

    return this;
  }

  public proximity(proximity: number): IQueryBuilder {
    let lastToken: LinkedListItem<IQueryToken>;
    let whereToken: WhereToken;

    if (!(lastToken = this.whereTokens.last) 
      && !((whereToken = <WhereToken>lastToken.value) instanceof WhereToken)
    ) {
      throw new InvalidOperationException("Missing where clause");
    }

    if (proximity < 1) {
      throw new ArgumentOutOfRangeException("Proximity distance must be a positive number");
    }

    whereToken.proximity = proximity;

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

  public search(fieldName: string, searchTermsParameterName: string, operator: SearchOperator = SearchOperators.Or): IQueryBuilder {
    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.search(fieldName, searchTermsParameterName, operator));

    return this;
  }

  public intersect(): IQueryBuilder {
    let lastToken: LinkedListItem<IQueryToken> 
      = this.whereTokens.last;

    if ((lastToken.value instanceof WhereToken) 
      || (lastToken.value instanceof CloseSubclauseToken)
    ) {
      this.isIntersect = false;
      this.whereTokens.addLast(<QueryToken>IntersectMarkerToken.instance);
    } else {
      throw new InvalidOperationException("Cannot add INTERSECT at this point.");
    }

    return this;
  }

  public distinct(): IQueryBuilder {
    if (this.isDistinct) {
      throw new InvalidOperationException("This is already a distinct query.");
    }

    this.isDistinct = true;
    this.selectTokens.addFirst(DistinctToken.instance);

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

  public groupByKey(fieldName: string, projectedName?: string): IQueryBuilder {
    this.assertNoRawQuery();
    this.isGroupBy = true;

    if (!TypeUtil.isNull(projectedName) && this.aliasToGroupByFieldName.has(projectedName)) {
      const fieldAlreadyProjected: string = this.aliasToGroupByFieldName.get(projectedName);

      if (!fieldName || (fieldName === fieldAlreadyProjected)) {
        fieldName = fieldAlreadyProjected;
      }
    }

    this.selectTokens.addLast(GroupByKeyToken.create(fieldName));

    return this;
  }

  public groupBySum(fieldName: string, projectedName?: string): IQueryBuilder {
    this.assertNoRawQuery();
    this.isGroupBy = true;

    fieldName = this.ensureValidFieldName(fieldName);

    this.selectTokens.addLast(GroupBySumToken.create(fieldName));

    return this;
  }

  public groupByCount(projectedName?: string): IQueryBuilder {
    this.assertNoRawQuery();
    this.isGroupBy = true;

    this.selectTokens.addLast(GroupByCountToken.create(projectedName));

    return this;
  }

  public whereTrue(): IQueryBuilder {
    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded();

    this.whereTokens.addLast(TrueToken.instance);

    return this;
  }

  public withinRadiusOf(fieldName: string, radiusParameterName: string, latitudeParameterName: string,
    longitudeParameterName: string, radiusUnits?: SpatialUnit = SpatialUnits.Kilometers,
    distErrorPercent: number = SpatialConstants.DefaultDistanceErrorPct
  ) {
    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    this.whereTokens.addLast(WhereToken.within(fieldName, ShapeToken.circle(radiusParameterName, latitudeParameterName, longitudeParameterName, radiusUnits), distErrorPercent));
  }

  public spatial(fieldName, shapeWKTParameterName: string, relation: SpatialRelation, distErrorPercent: number): IQueryBuilder;
  public spatial(fieldName: string, criteria: SpatialCriteria, parameterNameGenerator: SpatialParameterNameGenerator): IQueryBuilder;
  public spatial(fieldName: string, shapeWKTParameterNameOrCriteria: string | SpatialCriteria,
    relationOrParameterNameGenerator: SpatialRelation | SpatialParameterNameGenerator, distErrorPercent: number
  ): IQueryBuilder {
    let criteria: SpatialCriteria = <SpatialCriteria>shapeWKTParameterNameOrCriteria;
    let nameGenerator: SpatialParameterNameGenerator
      = <SpatialParameterNameGenerator>relationOrParameterNameGenerator;

    fieldName = this.ensureValidFieldName(fieldName);

    this.appendOperatorIfNeeded(this.whereTokens);
    this.negateIfNeeded(fieldName);

    if (!(shapeWKTParameterNameOrCriteria instanceof SpatialCriteria)) {
      const shapeWKTParameterName: string = <string>shapeWKTParameterNameOrCriteria;
      const relation: SpatialRelation = <SpatialRelation>relationOrParameterNameGenerator;

      criteria = new WktCriteria(null, relation, distErrorPercent);
      nameGenerator = (parameterValue: string | number): string => shapeWKTParameterName;
    }

    this.whereTokens.addLast(criteria.toQueryToken(fieldName, nameGenerator));
    return this;
  }

  public orderByDistance(fieldName: string, shapeWktParameterName: string): IQueryBuilder;
  public orderByDistance(fieldName: string, latitudeParameterName: string, longitudeParameterName: string): IQueryBuilder;
  public orderByDistance(fieldName: string, latitudeOrShapeWktParameterName: string, longitudeParameterName?: string): IQueryBuilder {
    this.orderByTokens.addLast(OrderByToken.createDistanceAscending(fieldName, latitudeOrShapeWktParameterName, longitudeParameterName));

    return this;
  }

  public orderByDistanceDescending(fieldName: string, shapeWktParameterName: string): IQueryBuilder;
  public orderByDistanceDescending(fieldName: string, latitudeParameterName: string, longitude: string): IQueryBuilder;
  public orderByDistanceDescending(fieldName: string, latitudeOrShapeWktParameterName: string, longitudeParameterName?: string): IQueryBuilder {
    this.orderByTokens.addLast(OrderByToken.createDistanceDescending(fieldName, latitudeOrShapeWktParameterName, longitudeParameterName));

    return this;
  }

  protected assertNoRawQuery(): void {
    if (!TypeUtil.isNull(this.queryRaw)) {
      throw new InvalidOperationException(
        "RawQuery was called, cannot modify this query by calling on operations that \
would modify the query (such as Where, Select, OrderBy, GroupBy, etc)"
      );
    }
  }

  public toString(): string {
    
        if (this.queryRaw != null) {
          return this.queryRaw;
        }
    
        if (this.currentClauseDepth !== 0) {
    
          throw new InvalidOperationException(
            StringUtil.format("A clause was not closed correctly within this query, current clause depth = {0}", this.currentClauseDepth));
        }
    
        let queryText = new StringBuilder();
    
        this.buildFrom(queryText);
        this.buildGroupBy(queryText);
        this.buildOrderBy(queryText);
        this.buildWhere(queryText);
        this.buildSelect(queryText);
        this.buildInclude(queryText);
    
        return queryText.toString();
    
      }

  protected ensureValidFieldName(fieldName: string, isNestedPath: boolean = false): string {
    const {VALIDATE_FIELD} = <typeof QueryBuilder>this.constructor;

    let result: IFieldValidationResult = {
      originalFieldName: fieldName,
      escapedFieldName: StringUtil.escapeIfNecessary(fieldName)
    };

    if (!this.isGroupBy && !isNestedPath) {
      if (!TypeUtil.isNull(this.idPropertyName) && (fieldName === this.idPropertyName)) {
        result.escapedFieldName = FieldConstants.DocumentIdFieldName;
      }

      this.emit<IFieldValidationResult>(VALIDATE_FIELD, result);
    }

    return result.escapedFieldName;
  }

  protected addSpaceIfNeeded(previousToken: IQueryToken, currentToken: IQueryToken, writer: StringBuilder): void {

    if (previousToken == null) {
      return;
    }

    if (previousToken instanceof OpenSubclauseToken ||
      currentToken instanceof CloseSubclauseToken ||
      currentToken instanceof IntersectMarkerToken) {
      return;
    }

    writer.append(" ");
  }

  protected appendOperatorIfNeeded(tokens: LinkedList<IQueryToken>): void {
    this.assertNoRawQuery();

    if (!tokens.count) {
      return;
    }

    const lastToken: IQueryToken = tokens.last.value;

    if (!(lastToken instanceof WhereToken) && !(lastToken instanceof CloseSubclauseToken)) {
      return;
    }

    let current = tokens.last;
    let lastWhere: WhereToken = null;

    while (!TypeUtil.isNull(current)) {
      if (current.value instanceof WhereToken) {
        lastWhere = <WhereToken>current.value;
        break;
      }

      current = current.previous;
    }

    let token: QueryToken = (SearchOperators.And === this.defaultOperator)
      ? QueryOperatorToken.And : QueryOperatorToken.Or;

    if (lastWhere && !TypeUtil.isNull(lastWhere.searchOperator)) {
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
      TypeUtil.isNull(fieldName)
        ? this.whereTrue()
        : this.whereExists(fieldName);

      this.andAlso();
    }

    this.whereTokens.addLast(<QueryToken>NegateToken.instance);
  }

  public buildFrom(writer): void {

    this.fromToken.writeTo(writer);

  }

  public buildOrderBy(writer): void {

    this.orderByToken.writeTo(writer);

  }

  public buildGroupBy(writer): void {

    this.groupByToken.writeTo(writer);

  }

  public buildSelect(writer): void {

    if (this.selectTokens.count === 0) {
      return;
    }

    writer
      .Append(" SELECT ");

    let token = this.selectTokens.first;

    if (this.selectTokens.count === 1
      && token.value instanceof DistinctToken) {

      token.value.writeTo(writer);
      writer.Append(" *");

      return;
    }

    while (token != null) {

      if (token.previous !== null
        && token.previous.value instanceof DistinctToken === false) {
        writer.Append(",");
      }

      this.addSpaceIfNeeded(token.previous.value, token.value, writer);

      token.value.writeTo(writer);

      token = token.next;

    }

  }

  public buildInclude(writer): void {

    if (this.includes === null
      || (<any>this.includes).length === 0) {

      return;

    } //TODO fix (<any>this.includes) type

    writer.append(" INCLUDE ");

    let first: boolean = true;

    this.includes.forEach((include) => {

      if (first === false) {
        writer.append(",");
      }

      first = false;
      let requiredQuotes = false;

      for (let i: number = 0; i < include.length; i++) {
        let ch: string = include[i];

        if (StringUtil.isLetterOrDigit(ch) && ch != '_' && ch != '.') {
          requiredQuotes = true;
          break;
        }
      }

      if (requiredQuotes) {
        writer
          .append("'")
          .append(include.replace("'", "\\'"))
          .append("'");
      }
      else {
        writer.append(include);
      }
    });
  }

  public buildWhere(writer): void {

    if (this.whereTokens) {
      return;
    }

    writer
      .append(" WHERE ");

    if (SpatialRelations.Intersects) {
      writer.append("intersect(");
    }

    let token = this.whereTokens.first;

    while (token !== null) {

      this.addSpaceIfNeeded(token.previous.value, token.value, writer);

      token.value.writeTo(writer);

      token = token.next;
    }

    if (SpatialRelations.Intersects) {
      writer
        .append(") ");
    }
  }


}