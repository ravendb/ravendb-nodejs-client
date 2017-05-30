import {IDocumentQuery} from "./IDocumentQuery";
import {IDocumentSession} from "./IDocumentSession";
import {RequestsExecutor} from "../../Http/Request/RequestsExecutor";
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {QueryResultsCallback} from '../../Utility/Callbacks';
import {PromiseResolve, PromiseResolver, PromiseReject} from '../../Utility/PromiseResolver';
import {EscapeQueryOption, EscapeQueryOptions} from "./EscapeQueryOptions";
import {LuceneValue, LuceneConditionValue, LuceneRangeValue} from "../Lucene/LuceneValue";
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {LuceneOperator, LuceneOperators} from "../Lucene/LuceneOperator";
import {LuceneBuilder} from "../Lucene/LuceneBuilder";
import {StringUtil} from "../../Utility/StringUtil";
import {QueryString} from "../../Http/QueryString";
import {ArrayUtil} from "../../Utility/ArrayUtil";
import {QueryOperators, QueryOperator} from "./QueryOperator";
import {DocumentConventions, DocumentConstructor, IDocumentConversionResult} from "../Conventions/DocumentConventions";
import * as BluebirdPromise from 'bluebird'
import * as moment from "moment";
import {IndexQuery} from "../../Database/Indexes/IndexQuery";
import {IRavenObject} from "../../Database/IRavenObject";
import {IOptionsSet} from "../../Utility/IOptionsSet";
import {QueryCommand} from "../../Database/Commands/QueryCommand";
import {TypeUtil} from "../../Utility/TypeUtil";
import {Observable} from "../../Utility/Observable";
import {ArgumentOutOfRangeException, InvalidOperationException, ErrorResponseException, RavenException} from "../../Database/DatabaseExceptions";

export type QueryResultsWithStatistics<T> = {results: T[], response: IRavenResponse};

export class DocumentQuery<T> extends Observable implements IDocumentQuery<T> {
  public static readonly EVENT_DOCUMENT_FETCHED = 'fetched:document';
  public static readonly EVENT_INCLUDES_FETCHED = 'fetched:includes';

  protected indexName: string;
  protected session: IDocumentSession;
  protected requestsExecutor: RequestsExecutor;
  protected includes?: string[] = null;
  protected queryBuilder: string = '';
  protected negate: boolean = false;
  protected fetch?: string[] = null;
  protected sortHints?: string[] = null;
  protected sortFields?: string[] = null;
  protected withStatistics: boolean = false;
  protected usingDefaultOperator?: QueryOperator = null;
  protected waitForNonStaleResults: boolean = false;
  protected objectType?: DocumentConstructor<T> = null;
  protected nestedObjectTypes: IRavenObject<DocumentConstructor> = {};
  
  constructor(session: IDocumentSession, requestsExecutor: RequestsExecutor, documentTypeOrObjectType?: string | DocumentConstructor<T>, indexName?: string, usingDefaultOperator
    ?: QueryOperator, waitForNonStaleResults: boolean = false, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, withStatistics: boolean = false
  ) {
    super();
    this.session = session;
    this.includes = includes;
    this.withStatistics = withStatistics;
    this.requestsExecutor = requestsExecutor;
    this.usingDefaultOperator = usingDefaultOperator;
    this.waitForNonStaleResults = waitForNonStaleResults;
    this.nestedObjectTypes = nestedObjectTypes || {} as IRavenObject<DocumentConstructor>;
    this.objectType = session.conventions.getObjectType(documentTypeOrObjectType);
    this.indexName = [(indexName || 'dynamic'), session.conventions.getDocumentsColleciton(documentTypeOrObjectType)].join('/');
  }

  public select(...args: string[]): IDocumentQuery<T> {
    if (args && args.length) {
      this.fetch = args;
    }

    return this;
  }

  public search(fieldName: string, searchTerms: string | string[], escapeQueryOptions?: EscapeQueryOption, boost: number = 1): IDocumentQuery<T> {
    if (boost < 0) {
      throw new ArgumentOutOfRangeException('Boost factor must be a positive number');
    }

    let quotedTerms = TypeUtil.isArray(searchTerms)
      ? (searchTerms as string[]).join(' ')
      : (searchTerms as string);

    quotedTerms = QueryString.encode(quotedTerms);
    this.addLuceneCondition<string>(fieldName, quotedTerms, LuceneOperators.Search, escapeQueryOptions || EscapeQueryOptions.RawQuery);

    if (boost != 1) {
      this.addStatement(StringUtil.format("^{0}", boost));
    }

    return this;
  }

  public where(conditions: IDocumentQueryConditions): IDocumentQuery<T> {
    ArrayUtil.mapObject(conditions, (value: any, fieldName: string): any => {
      if (TypeUtil.isArray(value)) {
        this.whereIn<LuceneValue>(fieldName, value as LuceneValue[]);
      } else {
        this.whereEquals<LuceneValue>(fieldName, value as LuceneValue);
      }
    });

    return this;
  }

  public whereEquals<V extends LuceneValue>(fieldName: string, value: V, escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll): IDocumentQuery<T> {
    return this.assertFieldName(fieldName)
      .addLuceneCondition<V>(fieldName, value, LuceneOperators.Equals, escapeQueryOptions) as IDocumentQuery<T>;
  }

  public whereEndsWith(fieldName: string, value: string): IDocumentQuery<T> {
    return this.assertFieldName(fieldName)
      .addLuceneCondition<string>(fieldName, value, LuceneOperators.EndsWith) as IDocumentQuery<T>;
  }

  public whereStartsWith(fieldName: string, value: string): IDocumentQuery<T> {
    return this.assertFieldName(fieldName)
      .addLuceneCondition<string>(fieldName, value, LuceneOperators.StartsWith) as IDocumentQuery<T>;
  }

  public whereIn<V extends LuceneValue>(fieldName: string, values: V[]): IDocumentQuery<T> {
    return this.assertFieldName(fieldName)
      .addLuceneCondition<V[]>(fieldName, values, LuceneOperators.In) as IDocumentQuery<T>;
  }

  public whereBetween<V extends LuceneValue>(fieldName: string, start?: V, end?: V): IDocumentQuery<T> {
    return this.assertFieldName(fieldName)
      .addLuceneCondition<LuceneRangeValue<V>>(
        fieldName, {min: start, max: end}, LuceneOperators.Between
      ) as IDocumentQuery<T>;
  }

  public whereBetweenOrEqual<V extends LuceneValue>(fieldName: string, start?: V, end?: V): IDocumentQuery<T> {
    return this.assertFieldName(fieldName).addLuceneCondition<LuceneRangeValue<V>>(
      fieldName, {min: start, max: end}, LuceneOperators.EqualBetween
    ) as IDocumentQuery<T>;
  }

  public whereGreaterThan<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery<T> {
    return this.whereBetween<V>(fieldName, value);
  }

  public whereGreaterThanOrEqual<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery<T> {
    return this.whereBetweenOrEqual<V>(fieldName, value);
  }

  public whereLessThan<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery<T> {
    return this.whereBetween<V>(fieldName, null, value);
  }

  public whereLessThanOrEqual<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery<T> {
    return this.whereBetweenOrEqual<V>(fieldName, null, value);
  }

  public whereIsNull(fieldName: string): IDocumentQuery<T> {
    return this.whereEquals<null>(fieldName, null);
  }

  public whereNotNull(fieldName: string): IDocumentQuery<T> {
    return (this.addSpace()
      .addStatement('(')
        .whereEquals<string>(fieldName, '*')
        .andAlso()
        .addNot()
        .whereEquals<null>(fieldName, null) as DocumentQuery<T>)
    .addStatement(')');
  }

  public orderBy(fieldsNames: string|string[]): IDocumentQuery<T> {
    const fields: string[] = TypeUtil.isArray(fieldsNames)
      ? (fieldsNames as string[])
      : [fieldsNames as string];

    fields.forEach((field) => {
      const fieldName: string = (field.charAt(0) == '-') ? field.substr(1) : field;
      let index: number = this.sortFields.indexOf(fieldName);

      if (-1 == index) {
        index = this.sortFields.indexOf(`-${fieldName}`);
      }

      if (-1 == index) {
        this.sortFields.push(field)
      } else {
        this.sortFields[index] = field;
      }
    });

    return this;
  }

  public orderByDescending(fieldsNames: string|string[]): IDocumentQuery<T> {
    const fields: string[] = TypeUtil.isArray(fieldsNames)
      ? (fieldsNames as string[])
      : [fieldsNames as string];

    return this.orderBy(fields.map((field) => `-${field}`));
  }

  public andAlso(): IDocumentQuery<T> {
    return this.addSpace().addStatement(QueryOperators.AND);
  }

  public orElse(): IDocumentQuery<T> {
    return this.addSpace().addStatement(QueryOperators.OR);
  }

  public addNot(): IDocumentQuery<T> {
    this.negate = true;

    return this;
  }

  public async get(callback?: QueryResultsCallback<T[]>): Promise<T[]>;
  public async get(callback?: QueryResultsCallback<QueryResultsWithStatistics<T>>): Promise<QueryResultsWithStatistics<T>>;
  public async get(callback?: QueryResultsCallback<T[]> | QueryResultsCallback<QueryResultsWithStatistics<T>>)
    : Promise<T[] | QueryResultsWithStatistics<T>> {
    const responseToDocuments: (response: IRavenResponse, resolve: PromiseResolve<T[]>
      | PromiseResolve<QueryResultsWithStatistics<T>>) => void = (response: IRavenResponse,
      resolve: PromiseResolve<T[]> | PromiseResolve<QueryResultsWithStatistics<T>>) => {
      let result: T[] | QueryResultsWithStatistics<T>  = [] as T[];
      const commandResponse: IRavenResponse = response as IRavenResponse;

      if (commandResponse.Results.length > 0) {
        let results: T[] = [] as T[];
        const fetchingFullDocs: boolean = !this.fetch 
          || (TypeUtil.isArray(this.fetch) && !this.fetch.length);

        commandResponse.Results.forEach((result: object) => {
          const conversionResult: IDocumentConversionResult<T> = this.session.conventions
              .convertToDocument<T>(result, this.objectType, this.nestedObjectTypes || {});

          results.push(conversionResult.document);

          this.emit<IDocumentConversionResult<T>>(
            DocumentQuery.EVENT_DOCUMENT_FETCHED, 
            conversionResult
          );
        });
       
        if (commandResponse.Includes && commandResponse.Includes.length) {
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

      PromiseResolver.resolve<T[] | QueryResultsWithStatistics<T>>(result, resolve, callback)
    };

    return this.withStatistics
      ? new Promise<QueryResultsWithStatistics<T>>((resolve: PromiseResolve<QueryResultsWithStatistics<T>>, reject: PromiseReject) =>
        this.executeQuery()
          .catch((error: RavenException) => PromiseResolver.reject(error, reject, callback))
          .then((response: IRavenResponse) => responseToDocuments(response, resolve)))
      : new Promise<T[]>((resolve: PromiseResolve<T[]>, reject: PromiseReject) =>
        this.executeQuery()
          .catch((error: RavenException) => PromiseResolver.reject(error, reject, callback))
          .then((response: IRavenResponse) => responseToDocuments(response, resolve)));
  }

  protected addSpace(): DocumentQuery<T> {
    if ((this.queryBuilder.length > 0) && !this.queryBuilder.endsWith(' ')) {
      this.addStatement(' ');
    }

    return this;
  }

  protected addStatement(statement: string): DocumentQuery<T> {
    if (this.queryBuilder.length > 0) {
      this.queryBuilder += statement;
    }

    return this;
  }

  protected addLuceneCondition<C extends LuceneConditionValue>(fieldName: string, condition: C,
    operator?: LuceneOperator, escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll
  ): DocumentQuery<T> {
    const luceneCondition: string = LuceneBuilder.buildCondition<C>(this.session.conventions, fieldName,
      condition, operator, escapeQueryOptions);

    this.addSpace();

    if (this.negate) {
      this.negate = false;
      this.addStatement('-');
    }

    this.queryBuilder += luceneCondition;
    return this;
  }

  protected assertFieldName(fieldName?: string): DocumentQuery<T> {
    if (!fieldName) {
      throw new InvalidOperationException('Empty field name is invalid');
    }

    return this;
  }

  protected executeQuery(): BluebirdPromise<IRavenResponse> {
    const queryOptions: IOptionsSet = {
      sort_hints: this.sortHints,
      sort_fields: this.sortFields,
      fetch: this.fetch,
      wait_for_non_stale_results: this.waitForNonStaleResults
    };

    const session: IDocumentSession = this.session;
    session.incrementRequestsCount();

    const conventions: DocumentConventions = session.conventions;
    const endTime: number = moment().unix() + conventions.timeout;
    const query: IndexQuery = new IndexQuery(this.queryBuilder, 0, 0, this.usingDefaultOperator, queryOptions);
    const queryCommand: QueryCommand = new QueryCommand(this.indexName, query, conventions, this.includes);

    return new BluebirdPromise<IRavenResponse>((resolve: PromiseResolve<IRavenResponse>, reject: PromiseReject) => {
      const request = () => {
        this.requestsExecutor.execute(queryCommand)
          .catch((error: Error) => reject(error))
          .then((response: IRavenResponse | null) => {
            if (TypeUtil.isNone(response)) {
              resolve({
                Results: [] as object[],
                Includes: [] as string[]
              } as IRavenResponse);
            } else if (response.IsStale && this.waitForNonStaleResults) {
              if (moment().unix() > endTime) {
                reject(new ErrorResponseException('The index is still stale after reached the timeout'));
              } else {
                setTimeout(request, 100);
              }
            } else {
              resolve(response);
            }
          });
      };

      request();
    });
  }
}