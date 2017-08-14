import * as BluebirdPromise from 'bluebird'
import * as moment from "moment";
import * as _ from "lodash";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocumentSession} from "./IDocumentSession";
import {RequestExecutor} from "../../Http/Request/RequestExecutor";
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {QueryResultsCallback, EntityCallback, EntitiesCountCallback} from '../../Utility/Callbacks';
import {PromiseResolver} from '../../Utility/PromiseResolver';
import {RQLValue} from "../RQL/RQLValue";
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {QueryOperator} from "./QueryOperator";
import {
  DocumentConventions,
  DocumentConstructor,
  IDocumentConversionResult,
  DocumentType
} from "../Conventions/DocumentConventions";
import {IndexQuery} from "../../Database/Indexes/IndexQuery";
import {IRavenObject} from "../../Database/IRavenObject";
import {IOptionsSet} from "../../Utility/IOptionsSet";
import {QueryCommand} from "../../Database/Commands/QueryCommand";
import {TypeUtil} from "../../Utility/TypeUtil";
import {Observable} from "../../Utility/Observable";
import {
  ErrorResponseException,
  RavenException
} from "../../Database/DatabaseExceptions";

import {QueryBuilder} from "../RQL/QueryBuilder";
import {ArrayUtil} from "../../Utility/ArrayUtil";

export type QueryResultsWithStatistics<T> = { results: T[], response: IRavenResponse };

export class DocumentQuery<T> extends Observable implements IDocumentQuery<T> {
  public static readonly EVENT_DOCUMENTS_QUERIED: string = 'queried:documents';
  public static readonly EVENT_DOCUMENT_FETCHED: string = 'fetched:document';
  public static readonly EVENT_INCLUDES_FETCHED: string = 'fetched:includes';

  protected indexName: string;
  protected session: IDocumentSession;
  protected requestExecutor: RequestExecutor;
  protected includes?: string[] = null;
  protected fetch?: string[] = null;
  protected sortHints?: string[] = null;
  protected sortFields?: string[] = null;
  protected withStatistics: boolean = false;
  protected usingDefaultOperator?: QueryOperator = null;
  protected waitForNonStaleResults: boolean = false;
  protected documentType?: DocumentType<T> = null;
  protected nestedObjectTypes: IRavenObject<DocumentConstructor> = {};
  private _take?: number = null;
  private _skip?: number = null;
  private _builder = null;

  constructor(session: IDocumentSession, requestExecutor: RequestExecutor, documentType?: DocumentType<T>, indexName?: string, usingDefaultOperator
    ?: QueryOperator, waitForNonStaleResults: boolean = false, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, withStatistics: boolean = false) {
    super();
    this.session = session;
    this.includes = includes;
    this.withStatistics = withStatistics;
    this.requestExecutor = requestExecutor;
    this.usingDefaultOperator = usingDefaultOperator;
    this.waitForNonStaleResults = waitForNonStaleResults;
    this.nestedObjectTypes = nestedObjectTypes || {} as IRavenObject<DocumentConstructor>;
    this.documentType = documentType;
    this.indexName = indexName || "@all_docs";
    this._builder = new QueryBuilder();


    if (!indexName && documentType) {
      this.indexName += "/" + session.conventions.getCollectionName(documentType);
    }
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

  public take(docsCount: number) {

    return this._take = docsCount;

  }

  public skip(skipCount: number) {

    return this._skip = skipCount;

  }

  public get not() {

    return this.negateNext();

  }

  public get and() {

    return this.andAlso();

  }

  public get or() {

    return this.orElse();

  }

  public andAlso() {

    return this._builder.and;

  }

  public orElse() {

    return this._builder.or;

  }

  public negateNext() {

    return this._builder.not;

  }

  public where<V extends RQLValue>(conditions: IDocumentQueryConditions) {

    ArrayUtil.mapObject(conditions, (value: any, fieldName: string): any => {
      if (TypeUtil.isArray(value)) {

        this.whereEquals(fieldName, value);

        let conditionNames = Object.keys(conditions).map(function(key){return conditions[key]});
        let conditionKey = Object.keys( conditions );
        let conditionKeyString = conditionKey.toString();

        Array.from(conditionNames[0]).forEach((value) => {
          this._builder
            .or
            .where('equals', conditionKeyString, value, false)
        });

      } else {
        this.whereIn(fieldName, value);
      }
    });

    return this;
  }

  public whereEquals<V extends RQLValue>(field, value) {

    this._builder
      .from(this.indexName)
      .where('equals', field, value);

    return this;

  }

  public whereIn<V extends RQLValue>(field, value) {

    this._builder
      .from(this.indexName)
      .where('in', field, value);

    return this;

  }

  public whereGreaterThan<V extends RQLValue>(field, value) {

    this._builder
      .from(this.indexName)
      .where('greaterThan', field, value);

    return this;

  }

  public whereGreaterThanOrEqual<V extends RQLValue>(field, value, orName, orValue) {

    this._builder
      .from(this.indexName)
      .where('greaterThan', field, value)
      .or
      .where('equals', orName, orValue);

    return this;

  }

  public whereLessThanOrEqual<V extends RQLValue>(field, value, orName, orValue)  {

    this._builder
      .from(this.indexName)
      .where('lessThan', field, value)
      .or
      .where('equals', orName, orValue);

    return this;

  }

  public whereLessThan<V extends RQLValue>(field, value: V) {

    this._builder
      .from(this.indexName)
      .where('lessThan', field, value);

    return this;

  }

  public startsWith<V extends RQLValue>(field, value) {

    this._builder
      .from(this.indexName)
      .where('startsWith', field, value);

    return this;

  }

  public endsWith<V extends RQLValue>(field, value) {

    this._builder
      .from(this.indexName)
      .where('endsWith', field, value);

    return this;

  }

  public search<V extends RQLValue>(field, value, boostField, boostValue, count) {

    this._builder
      .from(this.indexName)
      .where('search', field, value)
      .or
      .where('boost', {boostField: boostField, boostValue: boostValue}, count);

    return this;

  }

  public whereNotNull<V extends RQLValue>(field) {

    this._builder
      .from(this.indexName)
      .where('equals', field, 'null')
      .and
      .not
      .where('equals', field, 'null');

    return this;

  }

  public whereIsNull<V extends RQLValue>(field, value) {

    this._builder
      .from(this.indexName)
      .where('equals', field, value);

    return this;

  }

  public whereBetween<V extends RQLValue>(field, start, end) {

    this._builder
      .from(this.indexName)
      .where('between', field, {start: start, end: end});

    return this;

  }

  public whereBetweenOrEqual<V extends RQLValue>(field, start, end, orName, orValue) {

    this._builder
      .from(this.indexName)
      .where('between', field, {start: start, end: end})
      .or
      .where('equals', orName, orValue);

    return this;

  }

  public orderBy<V extends RQLValue>(field, direction) {

    this._builder
      .from(this.indexName)
      .order(field, direction);

    return this;

  }

  public selectFields<V extends RQLValue>(field) {

    this._builder
      .from(this.indexName)
      .select(field);

    return this;

  }

  public async get(callback?: QueryResultsCallback<T[]>): Promise<T[]>;
  public async get(callback?: QueryResultsCallback<QueryResultsWithStatistics<T>>): Promise<QueryResultsWithStatistics<T>>;
  public async get(callback?: QueryResultsCallback<T[]> | QueryResultsCallback<QueryResultsWithStatistics<T>>): Promise<T[] | QueryResultsWithStatistics<T>> {
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
    const query: IndexQuery = new IndexQuery(this._builder.getRql(), this._take, this._skip, this.usingDefaultOperator, queryOptions);

    const queryCommand: QueryCommand = new QueryCommand(this.indexName, query, conventions, this.includes);
    const endTime: number = moment().unix() + Math.max(conventions.requestTimeout, query.waitForNonStaleResultsTimeout);

    const request = () => this.requestExecutor
      .execute(queryCommand)
      .then((response: IRavenResponse | null): IRavenResponse | BluebirdPromise.Thenable<IRavenResponse> => {
        if (TypeUtil.isNone(response)) {
          return {
            Results: [] as object[],
            Includes: [] as string[]
          } as IRavenResponse;
        } else if (response.IsStale && this.waitForNonStaleResults) {
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

      if (Array.isArray(commandResponse.Includes) && commandResponse.Includes.length) {
        this.emit<object[]>(
          DocumentQuery.EVENT_INCLUDES_FETCHED,
          commandResponse.Includes as object[]
        );
      }

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