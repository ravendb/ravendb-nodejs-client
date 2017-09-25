import * as BluebirdPromise from 'bluebird'
import * as moment from "moment";
import * as _ from "lodash";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocumentSession} from "./IDocumentSession";
import {RequestExecutor} from "../../Http/Request/RequestExecutor";
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {QueryResultsCallback, EntityCallback, EntitiesCountCallback} from '../../Typedef/Callbacks';
import {PromiseResolver} from '../../Utility/PromiseResolver';
import {QueryValue} from "./Query/QueryValue";
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {DocumentConventions, DocumentConstructor, IDocumentConversionResult, DocumentType} from "../Conventions/DocumentConventions";
import {IndexQuery} from "../../Database/Indexes/IndexQuery";
import {IRavenObject} from "../../Typedef/IRavenObject";
import {IOptionsSet} from "../../Typedef/IOptionsSet";
import {QueryCommand} from "../../Database/Commands/QueryCommand";
import {TypeUtil} from "../../Utility/TypeUtil";
import {Observable} from "../../Utility/Observable";
import {ErrorResponseException, InvalidOperationException, RavenException} from "../../Database/DatabaseExceptions";

import {QueryBuilder} from "./Query/QueryBuilder";
import {ArrayUtil} from "../../Utility/ArrayUtil";
import {ConditionValue, OrderingType, QueryOperator, SearchOperator} from "./Query/QueryLanguage";
import {IQueryBuilder} from "./Query/IQueryBuilder";
import {SpatialUnit} from "./Query/Spatial/SpatialUnit";
import {SpatialRelation} from "./Query/Spatial/SpatialRelation";
import {SpatialCriteria} from "./Query/Spatial/SpatialCriteria";
import {IWhereParams, WhereParams} from "./Query/WhereParams";

export type QueryResultsWithStatistics<T> = { results: T[], response: IRavenResponse };

export class DocumentQuery<T extends Object = IRavenObject> extends Observable implements IDocumentQuery<T> {
  public static readonly EVENT_DOCUMENTS_QUERIED: string = 'queried:documents';
  public static readonly EVENT_DOCUMENT_FETCHED: string = 'fetched:document';
  public static readonly EVENT_INCLUDES_FETCHED: string = 'fetched:includes';

  protected _indexName: string;
  protected _collectionName: string;
  protected session: IDocumentSession;
  protected indexQueryOptions: IOptionsSet;
  protected requestExecutor: RequestExecutor;
  protected fetch?: string[] = null;
  protected sortHints?: string[] = null;
  protected sortFields?: string[] = null;
  protected withStatistics: boolean = false;
  protected _waitForNonStaleResults: boolean = false;
  protected documentType?: DocumentType<T> = null;
  protected nestedObjectTypes: IRavenObject<DocumentConstructor> = {};
  protected fromSource = {};
  private _take?: number = null;
  private _skip?: number = null;
  private _builder: IQueryBuilder = null;
  protected negate: boolean = false;

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

  constructor(session: IDocumentSession, requestExecutor: RequestExecutor, documentType?: DocumentType<T>,
    indexName?: string, waitForNonStaleResults: boolean = false, nestedObjectTypes?: IRavenObject<DocumentConstructor>,
    withStatistics: boolean = false, indexQueryOptions: IOptionsSet = {}
  ) {
    super();

    const conventions: DocumentConventions = session.conventions;

    this.session = session;
    this.indexQueryOptions = indexQueryOptions;
    this.withStatistics = withStatistics;
    this.requestExecutor = requestExecutor;
    this._waitForNonStaleResults = waitForNonStaleResults;
    this.nestedObjectTypes = nestedObjectTypes || {} as IRavenObject<DocumentConstructor>;
    this.documentType = documentType;
    this._indexName = indexName || "@all_docs";
    this._builder = new QueryBuilder(indexName,
      conventions.getCollectionName(documentType),
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
    return this;
  }

  public include(path: string): IDocumentQuery<T> {
    return this;
  }

  public usingDefaultOperator(operator: QueryOperator): IDocumentQuery<T> {
    return this;
  }

  public whereEquals<V extends ConditionValue>(whereParams: IWhereParams<V>): IDocumentQuery<T>;
  public whereEquals<V extends ConditionValue>(whereParams: WhereParams<V>): IDocumentQuery<T>;
  public whereEquals<V extends ConditionValue>(fieldName: string, value: V, exact: boolean = false): IDocumentQuery<T>;
  public whereEquals<V extends ConditionValue>(whereParamsOrFieldName: IWhereParams<V> | WhereParams<V> | string,
    value?: V, exact: boolean = false
  ): IDocumentQuery<T> {
    return this;
  }

  public whereNotEquals<V extends ConditionValue>(whereParams: IWhereParams<V>): IDocumentQuery<T>;
  public whereNotEquals<V extends ConditionValue>(whereParams: WhereParams<V>): IDocumentQuery<T>;
  public whereNotEquals<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;
  public whereNotEquals<V extends ConditionValue>(whereParamsOrFieldName: IWhereParams<V> | WhereParams<V> | string,
    value?: V, exact: boolean = false
  ): IDocumentQuery<T> {
    return this;
  }

  public openSubclause(): IDocumentQuery<T> {
    return this;
  }

  public closeSubclause(): IDocumentQuery<T> {
    return this;
  }

  public negateNext(): IDocumentQuery<T> {
    this._builder.negateNext();
    return this;
  }

  public whereIn<V extends ConditionValue>(fieldName: string, values: V[], exact?: boolean): IDocumentQuery<T> {
    return this;
  }

  public whereStartsWith<V extends ConditionValue>(fieldName: string, value: V): IDocumentQuery<T> {
    return this;
  }

  public whereEndsWith<V extends ConditionValue>(fieldName: string, value: V): IDocumentQuery<T> {
    return this;
  }

  public whereBetween<V extends ConditionValue>(fieldName: string, start: V, end: V, exact?: boolean): IDocumentQuery<T> {
    return this;
  }

  public whereGreaterThan<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T> {
    return this;
  }

  public whereGreaterThanOrEqual<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T> {
    return this;
  }

  public whereLessThan<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T> {
    return this;
  }

  public whereLessThanOrEqual<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T> {
    return this;
  }

  public whereExists(fieldName: string): IDocumentQuery<T> {
    return this;
  }


  public andAlso(): IDocumentQuery<T> {
    return this;
  }

  public orElse(): IDocumentQuery<T> {
    return this;
  }

  public boost(boost: number): IDocumentQuery<T> {
    return this;
  }

  public fuzzy(fuzzy: number): IDocumentQuery<T> {
    return this;
  }

  public proximity(proximity: number): IDocumentQuery<T> {
    return this;
  }

  public orderBy(field: string, ordering?: OrderingType): IDocumentQuery<T> {
    return this;
  }

  public orderByDescending(field: string, ordering?: OrderingType): IDocumentQuery<T> {
    return this;
  }

  public orderByScore(): IDocumentQuery<T> {
    return this;
  }

  public orderByScoreDescending(): IDocumentQuery<T> {
    return this;
  }

  public waitForNonStaleResults(waitTimeout?: number): IDocumentQuery<T> {
    return this;
  }

  public waitForNonStaleResultsAsOfNow(waitTimeout?: number): IDocumentQuery<T> {
    return this;
  }

  public search(fieldName: string, searchTerms: string, operator: SearchOperator): IDocumentQuery<T> {
    return this;
  }

  public intersect(): IDocumentQuery<T> {
    return this;
  }

  public distinct(): IDocumentQuery<T> {
    return this;
  }

  public containsAny<V extends ConditionValue>(fieldName: string, values: V[]): IDocumentQuery<T> {
    return this;
  }

  public containsAll<V extends ConditionValue>(fieldName: string, values: V[]): IDocumentQuery<T> {
    return this;
  }

  public groupBy(fieldName: string, ...fieldNames: string[]): IDocumentQuery<T> {
    return this;
  }

  public groupByKey(fieldName: string, projectedName?: string): IDocumentQuery<T> {
    return this;
  }

  public groupBySum(fieldName: string, projectedName?: string): IDocumentQuery<T> {
    return this;
  }

  public groupByCount(projectedName?: string): IDocumentQuery<T> {
    return this;
  }

  public whereTrue(): IDocumentQuery<T> {
    return this;
  }

  public withinRadiusOf(fieldName: string, radius: number, latitude: number, longitude: number, radiusUnits?: SpatialUnit, distErrorPercent?: number): IDocumentQuery<T> {
    return this;
  }

  public spatial(fieldName, shapeWKT: string, relation: SpatialRelation, distErrorPercent: number): IDocumentQuery<T>;
  public spatial(fieldName: string, criteria: SpatialCriteria): IDocumentQuery<T>;
  public spatial(fieldName: string, shapeWKTOrCriteria: string | SpatialCriteria, relation?: SpatialRelation, distErrorPercent?: number): IDocumentQuery<T> {
    return this;
  }

  public orderByDistance(fieldName: string, latitude: number, longitude: number): IDocumentQuery<T>;
  public orderByDistance(fieldName: string, shapeWkt: string): IDocumentQuery<T>;
  public orderByDistance(fieldName: string, latitudeOrShapeWkt: number | string, longitude?: number): IDocumentQuery<T> {
    return this;
  }

  public orderByDistanceDescending(fieldName: string, latitude: number, longitude: number): IDocumentQuery<T>;
  public orderByDistanceDescending(fieldName: string, shapeWkt: string): IDocumentQuery<T>;
  public orderByDistanceDescending(fieldName: string, latitudeOrShapeWkt: number | string, longitude?: number): IDocumentQuery<T> {
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

  public async single(callback?: EntityCallback<T>): Promise<T> {
    return this.count()
      .then((count: number): PromiseLike<T> => {
        if (count != 1) {
          return BluebirdPromise.reject<T>(
            new InvalidOperationException(
              "There are more then single document corresponding to query criteria"
            )
          );
        }

        return this.first(callback);
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback))
      .then((document: T): T => {
        PromiseResolver.resolve<T>(document, null, callback);
        return document;
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

  protected executeQuery(): BluebirdPromise<IRavenResponse> {
    const queryOptions: IOptionsSet = {
      sort_hints: this.sortHints,
      sort_fields: this.sortFields,
      fetch: this.fetch
    };

    this.emit(DocumentQuery.EVENT_DOCUMENTS_QUERIED);

    const session: IDocumentSession = this.session;
    const conventions: DocumentConventions = session.conventions;
    const query: IndexQuery = new IndexQuery(this._builder.toString(), this._take, this._skip, this.indexQueryOptions);

    const queryCommand: QueryCommand = new QueryCommand(query, conventions);
    const endTime: number = moment().unix() + Math.max(conventions.requestTimeout, query.waitForNonStaleResultsTimeout);

    const request = () => this.requestExecutor
      .execute(queryCommand)
      .then((response: IRavenResponse | null): IRavenResponse | BluebirdPromise.Thenable<IRavenResponse> => {
        if (TypeUtil.isNull(response)) {
          return {
            Results: [] as object[]
          } as IRavenResponse;
        } else if (response.IsStale && this._waitForNonStaleResults) {
          if (moment().unix() > endTime) {
            return BluebirdPromise.reject(new ErrorResponseException('The index is still stale after reached the timeout'));
          } else {
            return BluebirdPromise.delay(100).then(() => request());
          }
        } else {
          return response as IRavenResponse;
        }
      });

    return request();
  }

  protected convertResponseToDocuments(response: IRavenResponse): T[] | QueryResultsWithStatistics<T> {
    let result: T[] | QueryResultsWithStatistics<T> = [] as T[];
    const commandResponse: IRavenResponse = response as IRavenResponse;

    if (commandResponse.Results.length > 0) {
      let results: T[] = [] as T[];
      const fetchingFullDocs: boolean = !this.fetch
        || (TypeUtil.isArray(this.fetch) && !this.fetch.length);

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