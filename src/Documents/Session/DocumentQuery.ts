import * as BluebirdPromise from 'bluebird'
import * as moment from "moment";
import * as _ from "lodash";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocumentSession} from "./IDocumentSession";
import {RequestExecutor} from "../../Http/Request/RequestExecutor";
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {QueryResultsCallback, EntityCallback, EntitiesCountCallback} from '../../Utility/Callbacks';
import {PromiseResolver} from '../../Utility/PromiseResolver';
import {RQLValue, RQLConditionValue, RQLRangeValue} from "../RQL/RQLValue";
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {RQLOperator, RQLOperators} from "../RQL/RQLOperator";
//import {RQLBuilder} from "../RQL/RQLBuilder";
import {QueryString} from "../../Http/QueryString";
import {ArrayUtil} from "../../Utility/ArrayUtil";
import {QueryOperators, QueryOperator} from "./QueryOperator";
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
  ArgumentOutOfRangeException,
  InvalidOperationException,
  ErrorResponseException,
  RavenException
} from "../../Database/DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";

import {QueryBuilder} from "../RQL/QueryBuilder";

export type QueryResultsWithStatistics<T> = { results: T[], response: IRavenResponse };

export class DocumentQuery<T> extends Observable implements IDocumentQuery<T> {
  public static readonly EVENT_DOCUMENTS_QUERIED: string = 'queried:documents';
  public static readonly EVENT_DOCUMENT_FETCHED: string = 'fetched:document';
  public static readonly EVENT_INCLUDES_FETCHED: string = 'fetched:includes';

  protected indexName: string;
  protected session: IDocumentSession;
  protected requestExecutor: RequestExecutor;
  protected includes?: string[] = null;
  protected queryBuilder: string = '';
  protected negate: boolean = false;
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
  public builder = null;

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
    this.indexName = indexName || "Universals" || "dynamic";
    this.builder = new QueryBuilder();

    if (!indexName && documentType) {
      this.indexName += "/" + session.conventions.getCollectionName(documentType);
    }
  }

  public whereEquals(field, value) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('equals', field, value).getRql();

    return this;

  }

  public whereIn(field, value) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('in', field, value).getRql();

    return this;

  }

  public whereGreaterThan(field, value) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('greaterThan', field, value).getRql();

    return this;

  }

  public whereGreaterThanOrEqual(field, value, orName, orValue) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('greaterThan', field, value).getRql();

    this.builder.or;

    this.queryBuilder += this.builder
      .where('clear', orName, orValue, false).getRql();

    return this;

  }

  public whereLessThanOrEqual<V extends RQLValue>(field, value, orName, orValue)  {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('lessThan', field, value).getRql();

    this.builder.or;

    this.queryBuilder += this.builder
      .where('clear', orName, orValue, false).getRql();

    return this;

  }

  public whereLessThan<V>(field, value: V) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('lessThan', field, value).getRql();

    return this;

  }

  public startsWith(field, value) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('startsWith', field, value).getRql();

    return this;

  }

  public endsWith(field, value) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('endsWith', field, value).getRql();

    return this;

  }

  public search(field, value) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('search', field, value).getRql();

    return this;

  }

  public whereNotNull(field, value) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('equals', field, value).getRql();

    this.builder.andNot;

    this.queryBuilder += this.builder
      .where('clear', field, value).getRql();

    return this;

  }

  public whereIsNull(field, value) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('equals', field, value).getRql();

    return this;

  }

  public whereBetween(field, start, end) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('whereFiled', field).between(start, end).getRql();

    return this;

  }

  public whereBetweenOrEqual(field, start, end, orName, orValue) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .where('whereFiled', field).between(start, end).getRql();

    this.builder.or;

    this.queryBuilder += this.builder.where('clear', orName, orValue).getRql();

    return this;

  }

  public orderBy(field, direction) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .order(field, direction).getRql();

    return this;

  }

  public selectFields(field) {

    this.queryBuilder += this.builder
      .from(this.indexName)
      .select(field).getRql();

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
    const query: IndexQuery = new IndexQuery(this.queryBuilder, this._take, this._skip, this.usingDefaultOperator, queryOptions);

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