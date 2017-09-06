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
import {DocumentConventions, DocumentConstructor, IDocumentConversionResult, DocumentType} from "../Conventions/DocumentConventions";
import {IndexQuery} from "../../Database/Indexes/IndexQuery";
import {IRavenObject} from "../../Database/IRavenObject";
import {IOptionsSet} from "../../Utility/IOptionsSet";
import {QueryCommand} from "../../Database/Commands/QueryCommand";
import {TypeUtil} from "../../Utility/TypeUtil";
import {Observable} from "../../Utility/Observable";
import {ErrorResponseException, RavenException} from "../../Database/DatabaseExceptions";

import {QueryBuilder} from "../RQL/QueryBuilder";
import {ArrayUtil} from "../../Utility/ArrayUtil";

export type QueryResultsWithStatistics<T> = { results: T[], response: IRavenResponse };

export class DocumentQuery<T> extends Observable implements IDocumentQuery<T> {
  public static readonly EVENT_DOCUMENTS_QUERIED: string = 'queried:documents';
  public static readonly EVENT_DOCUMENT_FETCHED: string = 'fetched:document';
  public static readonly EVENT_INCLUDES_FETCHED: string = 'fetched:includes';

  protected indexName: string;
  protected session: IDocumentSession;
  protected indexQueryOptions: IOptionsSet;
  protected requestExecutor: RequestExecutor;
  protected fetch?: string[] = null;
  protected sortHints?: string[] = null;
  protected sortFields?: string[] = null;
  protected withStatistics: boolean = false;
  protected waitForNonStaleResults: boolean = false;
  protected documentType?: DocumentType<T> = null;
  protected nestedObjectTypes: IRavenObject<DocumentConstructor> = {};
  protected fromSource = {};
  private _take?: number = null;
  private _skip?: number = null;
  private _builder = null;

  constructor(session: IDocumentSession, requestExecutor: RequestExecutor, documentType?: DocumentType<T>,
    indexName?: string, waitForNonStaleResults: boolean = false, nestedObjectTypes?: IRavenObject<DocumentConstructor>,
    withStatistics: boolean = false, indexQueryOptions: IOptionsSet = {}
  ) {
    super();
    this.session = session;
    this.indexQueryOptions = indexQueryOptions;
    this.withStatistics = withStatistics;
    this.requestExecutor = requestExecutor;
    this.waitForNonStaleResults = waitForNonStaleResults;
    this.nestedObjectTypes = nestedObjectTypes || {} as IRavenObject<DocumentConstructor>;
    this.documentType = documentType;
    this.indexName = indexName || "@all_docs";
    this._builder = new QueryBuilder();


    if (indexName) {
      this._builder = this._builder.fromIndex(this.indexName);
    }
    else {
      this._builder = this._builder.fromCollection(this.indexName);
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

  public take(docsCount: number): IDocumentQuery<T> {

    this._take = docsCount;

    return this;

  }

  public skip(skipCount: number): IDocumentQuery<T> {

    this._skip = skipCount;

    return this;

  }

  public get not(): IDocumentQuery<T> {

    this.negateNext();

    return this;

  }

  public get or(): IDocumentQuery<T> {

    this.orElse();

    return this;

  }

  public OpenSubclause(): IDocumentQuery<T> {

    this._builder.openSubClause;

    return this;

  }

  public CloseSubclause(): IDocumentQuery<T> {

    this._builder.closeSubClause;

    return this;

  }

  public andAlso(): IDocumentQuery<T> {

    this._builder.and();

    return this;

  }

  public orElse(): IDocumentQuery<T> {

    this._builder.or();

    return this;

  }

  public negateNext(): IDocumentQuery<T> {

    this._builder.not();

    return this;

  }

  public where<V extends RQLValue>(conditions: IDocumentQueryConditions): IDocumentQuery<T> {

    ArrayUtil.mapObject(conditions, (value: any, fieldName: string): any => {
      if (TypeUtil.isArray(value)) {

        this.whereEquals(fieldName, value);

        let conditionNames = Object.keys(conditions).map(function(key){return conditions[key]});
        let conditionKey = Object.keys( conditions );
        let conditionKeyString = conditionKey.toString();

        Array.from(conditionNames[0]).forEach((value) => {
          this._builder
            .or()
            .where('equals', conditionKeyString, value, false)
        });

      } else {
        this.whereIn(fieldName, value);
      }
    });

    return this;
  }

  public whereEquals<V extends RQLValue>(field: string, value: V, exact?: boolean): IDocumentQuery<T> {

    this._builder
      .where('equals', field, value, {exact:exact});

    return this;

  }


  public whereEqualsAndOr<V extends RQLValue>(fieldFirst: string, valueFirst: string, fieldSecond: string, valueSecond: number, fieldThird: string,valueThird: number): IDocumentQuery<T> {

    this._builder
      .where('equals', fieldFirst, valueFirst)
      .and()
      .openSubClause()
      .where('equals', fieldSecond, valueSecond)
      .closeSubClause()
      .or()
      .where('equals', fieldThird, valueThird);

    return this;

  }

  public whereIn<V extends RQLValue>(field: string, value: V): IDocumentQuery<T> {

    this._builder.where('in', field, value);

    return this;

  }

  public whereGreaterThan<V extends RQLValue>(field: string, value: V): IDocumentQuery<T> {

    this._builder
      .where('greaterThan', field, value);

    return this;

  }

  public whereGreaterThanOrEqual<V extends RQLValue>(field: string, value: V): IDocumentQuery<T> {

    this._builder
      .where('greaterThanOrEqual', field, value);

    return this;

  }

  public whereLessThanOrEqual<V extends RQLValue>(field: string, value: V): IDocumentQuery<T>  {

    this._builder
      .where('lessThanOrEqual', field, value);

    return this;

  }

  public whereLessThan<V extends RQLValue>(field: string, value: V): IDocumentQuery<T> {

    this._builder
      .where('lessThan', field, value);

    return this;

  }

  public startsWith<V extends RQLValue>(field: string, value: V): IDocumentQuery<T> {

    this._builder
      .where('startsWith', field, value);

    return this;

  }

  public endsWith<V extends RQLValue>(field: string, value: V): IDocumentQuery<T> {

    this._builder
      .where('endsWith', field, value);

    return this;

  }

  public search<V extends RQLValue>(field: string, value: V, boostFactor?): IDocumentQuery<T> {

    this._builder
      .where('search', field, value);

    return this;

  }

  public whereNotNull<V extends RQLValue>(field: string): IDocumentQuery<T> {

    this._builder
      .where('equals', field, 'null')
      .and()
      .not()
      .where('equals', field, 'null');

    return this;

  }

  public whereIsNull<V extends RQLValue>(field: string, value: V): IDocumentQuery<T> {

    this._builder
      .where('equals', field, value);

    return this;

  }

  public whereBetween<V extends RQLValue>(field: string, min: V, max: V): IDocumentQuery<T> {

    this._builder
      .where('between', field, {min: min, max: max});

    return this;

  }

  public orderBy<V extends RQLValue>(field: string, direction: V): IDocumentQuery<T> {

    this._builder
      .order(field, direction);

    return this;

  }

  public selectFields(fields?: string): IDocumentQuery<T> {

    this._builder
      .select(fields);

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
    const query: IndexQuery = new IndexQuery(this._builder.getRql(), this._take, this._skip, this.indexQueryOptions);

    const queryCommand: QueryCommand = new QueryCommand(query, conventions);
    const endTime: number = moment().unix() + Math.max(conventions.requestTimeout, query.waitForNonStaleResultsTimeout);

    const request = () => this.requestExecutor
      .execute(queryCommand)
      .then((response: IRavenResponse | null): IRavenResponse | BluebirdPromise.Thenable<IRavenResponse> => {
        if (TypeUtil.isNone(response)) {
          return {
            Results: [] as object[]
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