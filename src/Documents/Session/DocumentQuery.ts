import * as BluebirdPromise from 'bluebird'
import * as moment from "moment";
import * as _ from "lodash";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocumentSession} from "./IDocumentSession";
import {RequestExecutor} from "../../Http/Request/RequestExecutor";
import {QueryResultsCallback, EntityCallback, EntitiesCountCallback} from '../../Typedef/Callbacks';
import {PromiseResolver} from '../../Utility/PromiseResolver';
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {DocumentConventions, DocumentConstructor, IDocumentConversionResult, DocumentType} from "../Conventions/DocumentConventions";
import {IndexQuery} from "../../Database/Indexes/IndexQuery";
import {IRavenObject} from "../../Typedef/IRavenObject";
import {IOptionsSet} from "../../Typedef/IOptionsSet";
import {QueryCommand} from "../../Database/Commands/QueryCommand";
import {TypeUtil} from "../../Utility/TypeUtil";
import {Observable} from "../../Utility/Observable";
import {ErrorResponseException, InvalidArgumentException, InvalidOperationException, RavenException} from "../../Database/DatabaseExceptions";
import {QueryBuilder} from "./Query/QueryBuilder";
import {ConditionValue, OrderingType, QueryOperator, SearchOperator} from "./Query/QueryLanguage";
import {IQueryBuilder} from "./Query/IQueryBuilder";
import {SpatialUnit} from "./Query/Spatial/SpatialUnit";
import {SpatialRelation} from "./Query/Spatial/SpatialRelation";
import {SpatialCriteria} from "./Query/Spatial/SpatialCriteria";
import {IWhereParams, WhereParams} from "./Query/WhereParams";
import {IJsonable} from "../../Typedef/Contracts";
import {DateUtil} from "../../Utility/DateUtil";

export type QueryResultsWithStatistics<T> = { results: T[], response: IRavenResponse };

export class DocumentQueryParameters extends Map<string, ConditionValue | ConditionValue[]> implements IJsonable {
  public toJson(): object {
    let result: object = {};
    let key: string = null;
    let value: ConditionValue | ConditionValue[] = null;

    for ([key, value] of this) {
      result[key] = value;
    }

    return result;
  }
}

export class DocumentQuery<T extends Object = IRavenObject> extends Observable implements IDocumentQuery<T> {
  public static readonly EVENT_DOCUMENTS_QUERIED: string = 'queried:documents';
  public static readonly EVENT_DOCUMENT_FETCHED: string = 'fetched:document';
  public static readonly EVENT_INCLUDES_FETCHED: string = 'fetched:includes';

  protected session: IDocumentSession;
  protected indexQueryOptions: IOptionsSet;
  protected requestExecutor: RequestExecutor;
  protected withStatistics: boolean = false;
  protected documentType?: DocumentType<T> = null;
  protected queryParameters: DocumentQueryParameters;
  protected nestedObjectTypes: IRavenObject<DocumentConstructor> = {};

  private _indexName: string;
  private _collectionName: string;
  private _take?: number = null;
  private _skip?: number = null;
  private _builder: IQueryBuilder = null;

  public get not(): IDocumentQuery<T> {
    this.negateNext();
    return this;
  }

  public get indexName(): string {
    return this._indexName;
  }

  public get collectionName(): string {
    return this._collectionName;
  }

  public get conventions(): DocumentConventions {
    return this.session.conventions;
  }

  public get isDynamicMapReduce(): boolean {
    return this._builder.isDynamicMapReduce;
  }

  constructor(session: IDocumentSession, requestExecutor: RequestExecutor, 
    documentType?: DocumentType<T>, indexName?: string, nestedObjectTypes?: IRavenObject<DocumentConstructor>, 
    withStatistics: boolean = false, indexQueryOptions: IOptionsSet = {}
  ) {
    super();

    const conventions: DocumentConventions = session.conventions;

    this.session = session;
    this.indexQueryOptions = indexQueryOptions;
    this.withStatistics = withStatistics;
    this.requestExecutor = requestExecutor;
    this.documentType = documentType;
    this.queryParameters = new DocumentQueryParameters();
    this.nestedObjectTypes = nestedObjectTypes || {} as IRavenObject<DocumentConstructor>;
    
    this._indexName = indexName;
    this._collectionName = conventions.getCollectionName(documentType);

    this._builder = new QueryBuilder(
      this._indexName, this._collectionName,
      conventions.getIdPropertyName(documentType)
    );
  }

  public rawQuery(query: string): IDocumentQuery<T> {
    this._builder.rawQuery(query);
    return this;
  }

  public selectFields(fields: string[]): IDocumentQuery<T>;
  public selectFields(fields: string[], projections: string[]): IDocumentQuery<T>;
  public selectFields(fields: string[], projections?: string[]): IDocumentQuery<T> {
    this._builder.selectFields(fields);
    return this;
  }

  public getProjectionFields(): string[] {
    return this._builder.getProjectionFields();
  }

  public randomOrdering(seed?: string): IDocumentQuery<T> {
    this._builder.randomOrdering(seed);
    return this;
  }

  public customSortUsing(typeName: string, descending?: boolean): IDocumentQuery<T> {
    this._builder.customSortUsing(typeName, descending);
    return this;
  }

  public include(path: string): IDocumentQuery<T> {
    this._builder.include(path);
    return this;
  }

  public usingDefaultOperator(operator: QueryOperator): IDocumentQuery<T> {
    this._builder.usingDefaultOperator(operator);
    return this;
  }

  public whereEquals<V extends ConditionValue>(whereParams: IWhereParams<V>): IDocumentQuery<T>;
  public whereEquals<V extends ConditionValue>(whereParams: WhereParams<V>): IDocumentQuery<T>;
  public whereEquals<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;
  public whereEquals<V extends ConditionValue>(whereParamsOrFieldName: IWhereParams<V> | WhereParams<V> | string,
    value?: V, exact: boolean = false
  ): IDocumentQuery<T> {
    let whereParams: WhereParams<V> = <WhereParams<V>>whereParamsOrFieldName;
    const fieldName: string = <string>whereParamsOrFieldName;
    
    if (TypeUtil.isString(fieldName)) {
      return this.whereEquals(WhereParams.from({
        fieldName, value, exact
      }));
    }

    if (!(whereParamsOrFieldName instanceof WhereParams)) {
      whereParams = WhereParams.from(<IWhereParams<V>>whereParams);
    }

    const transformedValue: V = this.transformValue(whereParams);

    this._builder.whereEquals(whereParams.parametrize(this.addQueryParameter<V>(transformedValue)));
    return this;
  }

  public whereNotEquals<V extends ConditionValue>(whereParams: IWhereParams<V>): IDocumentQuery<T>;
  public whereNotEquals<V extends ConditionValue>(whereParams: WhereParams<V>): IDocumentQuery<T>;
  public whereNotEquals<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;
  public whereNotEquals<V extends ConditionValue>(whereParamsOrFieldName: IWhereParams<V> | WhereParams<V> | string,
    value?: V, exact: boolean = false
  ): IDocumentQuery<T> {
    let whereParams: WhereParams<V> = <WhereParams<V>>whereParamsOrFieldName;
    const fieldName: string = <string>whereParamsOrFieldName;

    if (TypeUtil.isString(fieldName)) {
      return this.whereNotEquals(WhereParams.from({
        fieldName, value, exact
      }));
    }

    if (!(whereParamsOrFieldName instanceof WhereParams)) {
      whereParams = WhereParams.from(<IWhereParams<V>>whereParams);
    }

    const transformedValue: V = this.transformValue(whereParams);

    this._builder.whereNotEquals(whereParams.parametrize(this.addQueryParameter<V>(transformedValue)));
    return this;
  }

  public openSubclause(): IDocumentQuery<T> {
    this._builder.openSubclause();
    return this;
  }

  public closeSubclause(): IDocumentQuery<T> {
    this._builder.closeSubclause();
    return this;
  }

  public negateNext(): IDocumentQuery<T> {
    this._builder.negateNext();
    return this;
  }

  public whereIn<V extends ConditionValue>(fieldName: string, values: V[], exact?: boolean): IDocumentQuery<T> {
    const transformedValues: V[] = this.transformValuesArray<V>(fieldName, values);

    this._builder.whereIn(fieldName, this.addQueryParameter(values), exact);
    return this;
  }

  public whereStartsWith<V extends ConditionValue>(fieldName: string, value: V): IDocumentQuery<T> {
    const transformedValue: V = this.transformValue<V>(WhereParams.from<V>({
      fieldName, value, 
      allowWildcards: true
    }));

    this._builder.whereStartsWith(fieldName, this.addQueryParameter(transformedValue));
    return this;
  }

  public whereEndsWith<V extends ConditionValue>(fieldName: string, value: V): IDocumentQuery<T> {
    const transformedValue: V = this.transformValue<V>(WhereParams.from<V>({
      fieldName, value, 
      allowWildcards: true
    }));

    this._builder.whereEndsWith(fieldName, this.addQueryParameter(transformedValue));
    return this;
  }

  public whereBetween<V extends ConditionValue>(fieldName: string, start: V, end: V, exact?: boolean): IDocumentQuery<T> {
    let transformedFrom: V = '*' as V;
    let transformedTo: V = 'NULL' as V;

    if (!TypeUtil.isNull(start)) {
      transformedFrom = this.transformValue(WhereParams.from<V>({
        fieldName, value: start, exact
      }));
    }

    if (!TypeUtil.isNull(end)) {
      transformedTo = this.transformValue(WhereParams.from<V>({
        fieldName, value: end, exact
      }));
    }

    this._builder.whereBetween(
      fieldName, this.addQueryParameter(transformedFrom), 
      this.addQueryParameter(transformedTo), exact
    );

    return this;
  }

  public whereGreaterThan<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T> {
    let transformedValue: V = '*' as V;

    if (!TypeUtil.isNull(value)) {
      transformedValue = this.transformValue(WhereParams.from<V>({
        fieldName, value, exact
      }));
    }

    this._builder.whereGreaterThan(fieldName, this.addQueryParameter(transformedValue), exact);
    return this;
  }

  public whereGreaterThanOrEqual<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T> {
    let transformedValue: V = '*' as V;
    
    if (!TypeUtil.isNull(value)) {
      transformedValue = this.transformValue(WhereParams.from<V>({
        fieldName, value, exact
      }));
    }

    this._builder.whereGreaterThanOrEqual(fieldName, this.addQueryParameter(transformedValue), exact);
    return this;
  }

  public whereLessThan<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T> {
    let transformedValue: V = 'NULL' as V;
    
    if (!TypeUtil.isNull(value)) {
      transformedValue = this.transformValue(WhereParams.from<V>({
        fieldName, value, exact
      }));
    }

    this._builder.whereLessThan(fieldName, this.addQueryParameter(transformedValue), exact);
    return this;
  }

  public whereLessThanOrEqual<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T> {
    let transformedValue: V = 'NULL' as V;
    
    if (!TypeUtil.isNull(value)) {
      transformedValue = this.transformValue(WhereParams.from<V>({
        fieldName, value, exact
      }));
    }

    this._builder.whereLessThanOrEqual(fieldName, this.addQueryParameter(transformedValue), exact);
    return this;
  }

  public whereExists(fieldName: string): IDocumentQuery<T> {
    this._builder.whereExists(fieldName);
    return this;
  }

  public andAlso(): IDocumentQuery<T> {
    this._builder.andAlso();
    return this;
  }

  public orElse(): IDocumentQuery<T> {
    this._builder.orElse();
    return this;
  }

  public boost(boost: number): IDocumentQuery<T> {
    this._builder.boost(boost);
    return this;
  }

  public fuzzy(fuzzy: number): IDocumentQuery<T> {
    this._builder.fuzzy(fuzzy);
    return this;
  }

  public proximity(proximity: number): IDocumentQuery<T> {
    this._builder.proximity(proximity);
    return this;
  }

  public orderBy(field: string, ordering?: OrderingType): IDocumentQuery<T> {
    this._builder.orderBy(field, ordering);
    return this;
  }

  public orderByDescending(field: string, ordering?: OrderingType): IDocumentQuery<T> {
    this._builder.orderByDescending(field, ordering);
    return this;
  }

  public orderByScore(): IDocumentQuery<T> {
    this._builder.orderByScore();
    return this;
  }

  public orderByScoreDescending(): IDocumentQuery<T> {
    this._builder.orderByScoreDescending();
    return this;
  }

  public waitForNonStaleResults(waitTimeout?: number): IDocumentQuery<T> {
    _.assign(this.indexQueryOptions, {
      cutOffEtag: null,
      waitForNonStaleResults: true,      
      waitForNonStaleResultsTimeout: waitTimeout || IndexQuery.DefaultTimeout
    });

    return this;
  }

  public waitForNonStaleResultsAsOfNow(waitTimeout?: number): IDocumentQuery<T> {
    _.assign(this.indexQueryOptions, {
      waitForNonStaleResults: true,      
      waitForNonStaleResultsAsOfNow: true,      
      waitForNonStaleResultsTimeout: waitTimeout || IndexQuery.DefaultTimeout
    });

    return this;
  }

  public waitForNonStaleResultsAsOf(cutOffEtag: number, waitTimeout?: number): IDocumentQuery<T> {
    _.assign(this.indexQueryOptions, {
      cutOffEtag,
      waitForNonStaleResults: true,      
      waitForNonStaleResultsTimeout: waitTimeout || IndexQuery.DefaultTimeout
    });

    return this;
  }

  public search(fieldName: string, searchTerms: string, operator: SearchOperator): IDocumentQuery<T> {
    this._builder.search(fieldName, this.addQueryParameter(searchTerms), operator);
    return this;
  }

  public intersect(): IDocumentQuery<T> {
    this._builder.intersect();
    return this;
  }

  public distinct(): IDocumentQuery<T> {
    this._builder.distinct();
    return this;
  }

  public containsAny<V extends ConditionValue>(fieldName: string, values: V[]): IDocumentQuery<T> {
    const transformedValues: V[] = this.transformValuesArray<V>(fieldName, values);

    if (transformedValues.length) {
      this._builder.whereIn(fieldName, this.addQueryParameter(transformedValues));
    }

    return this;
  }

  public containsAll<V extends ConditionValue>(fieldName: string, values: V[]): IDocumentQuery<T> {
    const transformedValues: V[] = this.transformValuesArray<V>(fieldName, values);
    
    if (transformedValues.length) {
      this._builder.whereAllIn(fieldName, this.addQueryParameter(transformedValues));
    }

    return this;
  }

  public groupBy(fieldName: string, ...fieldNames: string[]): IDocumentQuery<T> {
    const builder: IQueryBuilder = this._builder;

    builder.groupBy.apply(builder, [fieldName].concat(fieldNames));
    return this;
  }

  public groupByKey(fieldName: string, projectedName?: string): IDocumentQuery<T> {
    this._builder.groupByKey(fieldName, projectedName);

    return this;
  }

  public groupBySum(fieldName: string, projectedName?: string): IDocumentQuery<T> {
    this._builder.groupBySum(fieldName, projectedName);

    return this;
  }

  public groupByCount(projectedName?: string): IDocumentQuery<T> {
    this._builder.groupByCount(projectedName);

    return this;
  }

  public whereTrue(): IDocumentQuery<T> {
    this._builder.whereTrue();

    return this;
  }

  public withinRadiusOf(fieldName: string, radius: number, latitude: number, longitude: number, radiusUnits?: SpatialUnit, distErrorPercent?: number): IDocumentQuery<T> {
    this._builder.withinRadiusOf(
      fieldName, this.addQueryParameter(radius), this.addQueryParameter(latitude), 
      this.addQueryParameter(longitude), radiusUnits, distErrorPercent
    );

    return this;
  }

  public spatial(fieldName: string, shapeWkt: string, relation: SpatialRelation, distErrorPercent: number): IDocumentQuery<T>;
  public spatial(fieldName: string, criteria: SpatialCriteria): IDocumentQuery<T>;
  public spatial(fieldName: string, shapeWktOrCriteria: string | SpatialCriteria, relation?: SpatialRelation, distErrorPercent?: number): IDocumentQuery<T> {
    const criteria: SpatialCriteria = <SpatialCriteria>shapeWktOrCriteria;
    const shapeWkt: string = <string>shapeWktOrCriteria;

    if (shapeWktOrCriteria instanceof SpatialCriteria) {
      this._builder.spatial(
        fieldName, criteria, (parameterValue: string | number): string => 
        this.addQueryParameter(parameterValue)
      );
    } else {
      this._builder.spatial(fieldName, this.addQueryParameter(shapeWkt), relation, distErrorPercent);
    }

    return this;
  }

  public orderByDistance(fieldName: string, latitude: number, longitude: number): IDocumentQuery<T>;
  public orderByDistance(fieldName: string, shapeWkt: string): IDocumentQuery<T>;
  public orderByDistance(fieldName: string, latitudeOrShapeWkt: number | string, longitude?: number): IDocumentQuery<T> {
    const shapeWkt: string = <string>latitudeOrShapeWkt;
    const latitude: number = <number>latitudeOrShapeWkt;

    if (TypeUtil.isNull(longitude)) {
      this._builder.orderByDistance(fieldName, this.addQueryParameter(shapeWkt));
    } else {
      this._builder.orderByDistance(fieldName, this.addQueryParameter(latitude), this.addQueryParameter(longitude));
    }

    return this;
  }

  public orderByDistanceDescending(fieldName: string, latitude: number, longitude: number): IDocumentQuery<T>;
  public orderByDistanceDescending(fieldName: string, shapeWkt: string): IDocumentQuery<T>;
  public orderByDistanceDescending(fieldName: string, latitudeOrShapeWkt: number | string, longitude?: number): IDocumentQuery<T> {
    const shapeWkt: string = <string>latitudeOrShapeWkt;
    const latitude: number = <number>latitudeOrShapeWkt;

    if (TypeUtil.isNull(longitude)) {
      this._builder.orderByDistanceDescending(fieldName, this.addQueryParameter(shapeWkt));
    } else {
      this._builder.orderByDistanceDescending(fieldName, this.addQueryParameter(latitude), this.addQueryParameter(longitude));
    }

    return this;
  }

  public take(docsCount: number): IDocumentQuery<T> {
    this._take = docsCount;
    return this;
  }

  public skip(skipCount: number): IDocumentQuery<T> {
    this._skip = skipCount;
    return this;
  }

  public getIndexQuery(): IndexQuery {
    let skip: number = 0;
    let take: number = TypeUtil.MAX_INT32;
    const query: string = this._builder.toString();
    const queryParams: IRavenObject = <IRavenObject>this.queryParameters.toJson();

    if (!TypeUtil.isNull(this._skip)) {
      skip = this._skip;
    }

    if (!TypeUtil.isNull(this._take)) {
      take = this._take;
    }
    
    return new IndexQuery(query, take, skip, queryParams, this.indexQueryOptions);
  }

  public async single(callback?: EntityCallback<T>): Promise<T> {
    const take: number = this._take;
    const skip: number = this._skip;
    const withStatistics: boolean = this.withStatistics;

    this._take = 2;
    this._skip = 0;
    this.withStatistics = false;

    return this.executeQuery()
      .then((response: IRavenResponse): T | PromiseLike<T> => {
        const results: T[] = <T[]>this.convertResponseToDocuments(response);
        const result: T = results.length ? _.first(results) : null;

        if (results.length != 1) {
          return BluebirdPromise.reject<T>(
            new InvalidOperationException(
              "There are more then single or no documents corresponding to query criteria"
            )
          );
        }

        PromiseResolver.resolve<T>(result, null, callback);
        return result;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback))
      .finally(() => {
        this._take = take;
        this._skip = skip;
        this.withStatistics = withStatistics;
      });
  }

  public async first(callback?: EntityCallback<T>): Promise<T> {
    const take: number = this._take;
    const skip: number = this._skip;
    const withStatistics: boolean = this.withStatistics;

    this._take = 1;
    this._skip = 0;
    this.withStatistics = false;

    return this.executeQuery()
      .then((response: IRavenResponse): T => {
        const results: T[] = <T[]>this.convertResponseToDocuments(response);
        const result: T = results.length ? _.first(results) : null;

        PromiseResolver.resolve<T>(result, null, callback);
        return result;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback))
      .finally(() => {
        this._take = take;
        this._skip = skip;
        this.withStatistics = withStatistics;
      });
  }

  public async count(callback?: EntitiesCountCallback): Promise<number> {
    const take: number = this._take;
    const skip: number = this._skip;

    this._take = 0;
    this._skip = 0;

    return this.executeQuery()
      .then((response: IRavenResponse): number => {
        const result: number = <number>response.TotalResults || 0;

        PromiseResolver.resolve<number>(result, null, callback);
        return result;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback))
      .finally(() => {
        this._take = take;
        this._skip = skip;
      });
  }

  public async all(callback?: QueryResultsCallback<T[]>): Promise<T[]>;
  public async all(callback?: QueryResultsCallback<QueryResultsWithStatistics<T>>): Promise<QueryResultsWithStatistics<T>>;
  public async all(callback?: QueryResultsCallback<T[]> | QueryResultsCallback<QueryResultsWithStatistics<T>>): Promise<T[] | QueryResultsWithStatistics<T>> {
    return this.executeQuery()
      .then((response: IRavenResponse): T[] | QueryResultsWithStatistics<T> => {
        const result: T[] | QueryResultsWithStatistics<T> = this.convertResponseToDocuments(response);

        PromiseResolver.resolve<T[] | QueryResultsWithStatistics<T>>(result, null, callback);

        return result;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
  }

  protected addQueryParameter<V extends ConditionValue>(valueOrValues: V | V[]) {
    const parameterName = `p${this.queryParameters.size}`;

    this.queryParameters.set(parameterName, valueOrValues);
    return parameterName;
  }

  protected transformValue<V extends ConditionValue>(whereParams: WhereParams<V>): V {
    const value: V = whereParams.value;

    if (TypeUtil.isNull(value)) {
      return null;
    }

    if ("" === <string>value) {
      return "" as V;
    }

    if (value instanceof Date) {
      return DateUtil.stringify(<Date>value) as V;
    }

    if (!["boolean", "number", "string"].includes(typeof value)) {
      throw new InvalidArgumentException(
        "Invalid value passed to query condition. \
Only integer / number / string and null values are supported"
      );
    }

    return value;
  }

  protected transformValuesArray<V extends ConditionValue>(fieldName: string, values: Array<V | V[]>): V[] {
    let result: V[] = [];
    let nestedWhereParams: WhereParams<V>;
    const unpacked: V[] = this.unpackValuesArray<V>(values);

    for (let value of unpacked) {
      nestedWhereParams = WhereParams.from<V>({
        fieldName, value,
        allowWildcards: true
      });

      result.push(this.transformValue<V>(nestedWhereParams));
    }

    return result;
  }

  protected unpackValuesArray<V extends ConditionValue>(values: Array<V | V[]>): V[] {
    let result: V[] = [];

    for (let value of values) {
      if (TypeUtil.isArray(value)) {
        result = result.concat(this.unpackValuesArray<V>(<V[]>value));
      } else {
        result.push(<V>value);
      }
    }

    return result;
  }

  protected executeQuery(): BluebirdPromise<IRavenResponse> {
    this.emit(DocumentQuery.EVENT_DOCUMENTS_QUERIED);

    const session: IDocumentSession = this.session;
    const conventions: DocumentConventions = session.conventions;
    const query: IndexQuery = this.getIndexQuery();
    const queryCommand: QueryCommand = new QueryCommand(query, conventions);

    return this.requestExecutor
      .execute(queryCommand)
      .then((response: IRavenResponse | null): IRavenResponse | BluebirdPromise.Thenable<IRavenResponse> => {
        if (TypeUtil.isNull(response)) {
          return {
            Results: [] as object[]
          } as IRavenResponse;
        } else if (response.IsStale) {
          return BluebirdPromise.reject(new ErrorResponseException('The index is still stale after reached the timeout'));
        } else {
          return response as IRavenResponse;
        }
      });
  }

  protected convertResponseToDocuments(response: IRavenResponse): T[] | QueryResultsWithStatistics<T> {
    let result: T[] | QueryResultsWithStatistics<T> = [] as T[];
    const commandResponse: IRavenResponse = response as IRavenResponse;

    if (commandResponse.Results.length > 0) {
      let results: T[] = [] as T[];

      commandResponse.Results.forEach((result: object) => {
        const conversionResult: IDocumentConversionResult<T> = this.session.conventions
          .convertToDocument<T>(result, this.documentType, this.nestedObjectTypes || {});

        results.push(conversionResult.document);

        this.emit<IDocumentConversionResult<T>>(
          DocumentQuery.EVENT_DOCUMENT_FETCHED,
          conversionResult
        );
      });

      if (this.withStatistics) {
        result = {
          results: results,
          response: response
        } as QueryResultsWithStatistics<T>;
      } else {
        result = results as T[];
      }
    }

    return result as T[] | QueryResultsWithStatistics<T>;
  }
}