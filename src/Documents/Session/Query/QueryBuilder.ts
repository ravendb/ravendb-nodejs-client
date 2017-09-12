import {IQueryBuilder} from "./IQueryBuilder";
import {FieldConstants, OrderingType, QueryOperator} from "./QueryLanguage";
import {SearchOperator} from "./QueryLanguage";
import {SpartialCriteria} from "./Spartial/SpartialCriteria";
import {LinkedList} from "../../../Utility/LinkedList";
import {QueryToken} from "./Tokens/QueryToken";
import {FromToken} from "./Tokens/FromToken";
import {FieldsToFetchToken} from "./Tokens/FieldsToFetchToken";
import {InvalidOperationException} from "../../../Database/DatabaseExceptions";
import {TypeUtil} from "../../../Utility/TypeUtil";
import {OrderByToken} from "./Tokens/OrderByToken";

export class QueryBuilder implements IQueryBuilder {
  protected selectTokens: LinkedList<QueryToken>;
  protected fromToken: FromToken;
  protected fieldsToFetchToken: FieldsToFetchToken;
  protected whereTokens: LinkedList<QueryToken>;
  protected groupByTokens: LinkedList<QueryToken>;
  protected orderByTokens: LinkedList<QueryToken>;
  protected defaultOperator: QueryOperator = null;
  protected queryRaw?: string = null;

  constructor(indexName?: string, collectionName?: string) {
    if (indexName || collectionName) {
      this.from(indexName, collectionName);
    }

    this.selectTokens = new LinkedList<QueryToken>();
    this.whereTokens = new LinkedList<QueryToken>();
    this.groupByTokens = new LinkedList<QueryToken>();
    this.orderByTokens = new LinkedList<QueryToken>();
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
    return this;
  }

  public whereEquals(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {
    return this;
  }

  public whereNotEquals(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {
    return this;
  }

  public openSubclause(): IQueryBuilder {
    return this;
  }

  public closeSubclause(): IQueryBuilder {
    return this;
  }

  public negateNext(): IQueryBuilder {
    return this;
  }

  public whereIn(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {
    return this;
  }

  public whereStartsWith(fieldName: string, parameterName: string): IQueryBuilder {
    return this;
  }

  public whereEndsWith(fieldName: string, parameterName: string): IQueryBuilder {
    return this;
  }

  public whereBetween(fieldName: string, fromParameterName: string, toParameterName: string, exact: boolean = false): IQueryBuilder {
    return this;
  }

  public whereGreaterThan(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {
    return this;
  }

  public whereGreaterThanOrEqual(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {
    return this;
  }

  public whereLessThan(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {
    return this;
  }

  public whereLessThanOrEqual(fieldName: string, parameterName: string, exact: boolean = false): IQueryBuilder {
    return this;
  }

  public whereExists(fieldName: string): IQueryBuilder {
    return this;
  }

  public andAlso(): IQueryBuilder {
    return this;
  }

  public orElse(): IQueryBuilder {
    return this;
  }

  public boost(boost: number): IQueryBuilder {
    return this;
  }

  public fuzzy(fuzzy: number): IQueryBuilder {
    return this;
  }

  public proximity(proximity: number): IQueryBuilder {
    return this;
  }

  public orderBy(field: string, ordering?: OrderingType): IQueryBuilder {
    return this;
  }

  public orderByDescending(field: string, ordering?: OrderingType): IQueryBuilder {
    return this;
  }

  public orderByScore(): IQueryBuilder {
    return this;
  }

  public orderByScoreDescending(): IQueryBuilder {
    return this;
  }

  public search(fieldName: string, searchTerms: string, operator: SearchOperator): IQueryBuilder {
    return this;
  }

  public intersect(): IQueryBuilder {
    return this;
  }

  public distinct(): IQueryBuilder {
    return this;
  }

  public containsAny(fieldName: string, parameterName: string): IQueryBuilder {
    return this;
  }

  public containsAll(fieldName: string, parameterName: string): IQueryBuilder {
    return this;
  }

  public groupBy(fieldName: string, ...fieldNames): IQueryBuilder {
    return this;
  }

  public groupByKey(fieldName: string, projectedName?: string): IQueryBuilder {
    return this;
  }

  public groupBySum(fieldName: string, projectedName?: string): IQueryBuilder {
    return this;
  }

  public groupByCount(projectedName?: string): IQueryBuilder {
    return this;
  }

  public whereTrue(): IQueryBuilder {
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
}