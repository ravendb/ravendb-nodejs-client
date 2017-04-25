import {IDocument, IDocumentType} from "../IDocument";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocumentSession} from "./IDocumentSession";
import {RequestsExecutor} from "../../Http/Request/RequestsExecutor";
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {QueryResultsCallback} from '../../Utility/Callbacks';
import {PromiseResolve, PromiseResolver, PromiseReject} from '../../Utility/PromiseResolver';
import {EscapeQueryOption, EscapeQueryOptions} from "./EscapeQueryOptions";
import {LuceneValue, LuceneConditionValue, LuceneRangeValue} from "../Lucene/LuceneValue";
import {IRavenCommandResponse} from "../../Database/IRavenCommandResponse";
import {LuceneOperator, LuceneOperators} from "../Lucene/LuceneOperator";
import {LuceneBuilder} from "../Lucene/LuceneBuilder";
import {StringUtil} from "../../Utility/StringUtil";
import {QueryString} from "../../Http/QueryString";
import {ArrayUtil} from "../../Utility/ArrayUtil";
import {QueryOperators, QueryOperator} from "./QueryOperator";
import {DocumentConventions} from "../Conventions/DocumentConventions";
import * as Promise from 'bluebird'
import * as moment from "moment";
import {IndexQuery} from "../../Database/Indexes/IndexQuery";
import {IOptionsSet} from "../../Utility/IOptionsSet";
import {QueryCommand} from "../../Database/Commands/QueryCommand";
import {TypeUtil} from "../../Utility/TypeUtil";
import {ArgumentOutOfRangeException, InvalidOperationException, ErrorResponseException, RavenException} from "../../Database/DatabaseExceptions";

export type QueryResultsWithStatistics<T> = {results: T[], response: IRavenCommandResponse};

export class DocumentQuery implements IDocumentQuery {
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

  constructor(session: IDocumentSession, requestsExecutor: RequestsExecutor, documentType?: IDocumentType, indexName?: string, usingDefaultOperator
    ?: QueryOperator, waitForNonStaleResults: boolean = false, includes?: string[], withStatistics: boolean = false
  ) {
    this.session = session;
    this.includes = includes;
    this.withStatistics = withStatistics;
    this.requestsExecutor = requestsExecutor;
    this.usingDefaultOperator = usingDefaultOperator;
    this.waitForNonStaleResults = waitForNonStaleResults;
    this.indexName = [(indexName || 'dynamic'), session.conventions.getDocumentsColleciton(documentType)].join('/');
  }

  public select(...args: string[]): IDocumentQuery {
    if (args && args.length) {
      this.fetch = args;
    }

    return this;
  }

  public search(fieldName: string, searchTerms: string | string[], escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.RawQuery, boost: number = 1): IDocumentQuery {
    if (boost < 0) {
      throw new ArgumentOutOfRangeException('Boost factor must be a positive number');
    }

    let quotedTerms = TypeUtil.isArray(searchTerms)
      ? (searchTerms as string[]).join(' ')
      : (searchTerms as string);

    quotedTerms = QueryString.encode(quotedTerms);
    this.addLuceneCondition<string>(fieldName, quotedTerms, LuceneOperators.Search, escapeQueryOptions);

    if (boost != 1) {
      this.addStatement(StringUtil.format("^{0}", boost));
    }

    return this;
  }

  public where(conditions: IDocumentQueryConditions): IDocumentQuery {
    ArrayUtil.mapObject(conditions, (value: any, fieldName: string): any => {
      if (TypeUtil.isArray(value)) {
        this.whereIn<LuceneValue>(fieldName, value as LuceneValue[]);
      } else {
        this.whereEquals<LuceneValue>(fieldName, value as LuceneValue);
      }
    });

    return this;
  }

  public whereEquals<V extends LuceneValue>(fieldName: string, value: V, escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll): IDocumentQuery {
    return this.assertFieldName(fieldName)
      .addLuceneCondition<V>(fieldName, value, LuceneOperators.Equals, escapeQueryOptions) as IDocumentQuery;
  }

  public whereEndsWith(fieldName: string, value: string): IDocumentQuery {
    return this.assertFieldName(fieldName)
      .addLuceneCondition<string>(fieldName, value, LuceneOperators.EndsWith) as IDocumentQuery;
  }

  public whereStartsWith(fieldName: string, value: string): IDocumentQuery {
    return this.assertFieldName(fieldName)
      .addLuceneCondition<string>(fieldName, value, LuceneOperators.StartsWith) as IDocumentQuery;
  }

  public whereIn<V extends LuceneValue>(fieldName: string, values: V[]): IDocumentQuery {
    return this.assertFieldName(fieldName)
      .addLuceneCondition<V[]>(fieldName, values, LuceneOperators.In) as IDocumentQuery;
  }

  public whereBetween<V extends LuceneValue>(fieldName: string, start?: V, end?: V): IDocumentQuery {
    return this.assertFieldName(fieldName)
      .addLuceneCondition<LuceneRangeValue<V>>(
        fieldName, {min: start, max: end}, LuceneOperators.Between
      ) as IDocumentQuery;
  }

  public whereBetweenOrEqual<V extends LuceneValue>(fieldName: string, start?: V, end?: V): IDocumentQuery {
    return this.assertFieldName(fieldName).addLuceneCondition<LuceneRangeValue<V>>(
      fieldName, {min: start, max: end}, LuceneOperators.EqualBetween
    ) as IDocumentQuery;
  }

  public whereGreaterThan<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery {
    return this.whereBetween<V>(fieldName, value);
  }

  public whereGreaterThanOrEqual<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery {
    return this.whereBetweenOrEqual<V>(fieldName, value);
  }

  public whereLessThan<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery {
    return this.whereBetween<V>(fieldName, null, value);
  }

  public whereLessThanOrEqual<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery {
    return this.whereBetweenOrEqual<V>(fieldName, null, value);
  }

  public whereIsNull(fieldName: string): IDocumentQuery {
    return this.whereEquals<null>(fieldName, null);
  }

  public whereNotNull(fieldName: string): IDocumentQuery {
    return (this.addSpace()
      .addStatement('(')
        .whereEquals<string>(fieldName, '*')
        .andAlso()
        .addNot()
        .whereEquals<null>(fieldName, null) as DocumentQuery)
    .addStatement(')');
  }

  public orderBy(fieldsNames: string|string[]): IDocumentQuery {
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

  public orderByDescending(fieldsNames: string|string[]): IDocumentQuery {
    const fields: string[] = TypeUtil.isArray(fieldsNames)
      ? (fieldsNames as string[])
      : [fieldsNames as string];

    return this.orderBy(fields.map((field) => `-${field}`));
  }

  public andAlso(): IDocumentQuery {
    return this.addSpace().addStatement(QueryOperators.AND);
  }

  public orElse(): IDocumentQuery {
    return this.addSpace().addStatement(QueryOperators.OR);
  }

  public addNot(): IDocumentQuery {
    this.negate = true;

    return this;
  }

  public get(callback?: QueryResultsCallback<IDocument[]>): Promise<IDocument[]>;
  public get(callback?: QueryResultsCallback<QueryResultsWithStatistics<IDocument>>): Promise<QueryResultsWithStatistics<IDocument>>;
  public get(callback?: QueryResultsCallback<IDocument[]> | QueryResultsCallback<QueryResultsWithStatistics<IDocument>>)
    : Promise<IDocument[]> | Promise<QueryResultsWithStatistics<IDocument>> {
    const responseToDocuments: (response: IRavenCommandResponse, resolve: PromiseResolve<IDocument[]>
      | PromiseResolve<QueryResultsWithStatistics<IDocument>>) => void = (response: IRavenCommandResponse,
      resolve: PromiseResolve<IDocument[]> | PromiseResolve<QueryResultsWithStatistics<IDocument>>) => {
      let result: IDocument[] | QueryResultsWithStatistics<IDocument>  = [] as IDocument[];

      if (response.Results.length > 0) {
        let results: IDocument[] = [];

        response.Results.forEach((result: Object) => results.push(
          this.session.conventions
            .tryConvertToDocument(result)
            .document
        ));

        if (this.withStatistics) {
          result = {
            results: results,
            response: response
          } as QueryResultsWithStatistics<IDocument>;
        } else {
          result = results as IDocument[];
        }
      }

      PromiseResolver.resolve<IDocument[] | QueryResultsWithStatistics<IDocument>>(result, resolve, callback)
    };

    return this.withStatistics
      ? new Promise<QueryResultsWithStatistics<IDocument>>((resolve: PromiseResolve<QueryResultsWithStatistics<IDocument>>, reject: PromiseReject) =>
        this.executeQuery()
          .catch((error: RavenException) => PromiseResolver.reject(error, reject, callback))
          .then((response: IRavenCommandResponse) => responseToDocuments(response, resolve)))
      : new Promise<IDocument[]>((resolve: PromiseResolve<IDocument[]>, reject: PromiseReject) =>
        this.executeQuery()
          .catch((error: RavenException) => PromiseResolver.reject(error, reject, callback))
          .then((response: IRavenCommandResponse) => responseToDocuments(response, resolve)));
  }

  protected addSpace(): DocumentQuery {
    if ((this.queryBuilder.length > 0) && !this.queryBuilder.endsWith(' ')) {
      this.addStatement(' ');
    }

    return this;
  }

  protected addStatement(statement: string): DocumentQuery {
    if (this.queryBuilder.length > 0) {
      this.queryBuilder += statement;
    }

    return this;
  }

  protected addLuceneCondition<T extends LuceneConditionValue>(fieldName: string, condition: T,
    operator?: LuceneOperator, escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll
  ): DocumentQuery {
    const luceneCondition: string = LuceneBuilder.buildCondition<T>(this.session.conventions, fieldName,
      condition, operator, escapeQueryOptions);

    this.addSpace();

    if (this.negate) {
      this.negate = false;
      this.addStatement('-');
    }

    this.queryBuilder += luceneCondition;
    return this;
  }

  protected assertFieldName(fieldName?: string): DocumentQuery {
    if (!fieldName) {
      throw new InvalidOperationException('Empty field name is invalid');
    }

    return this;
  }

  protected executeQuery(): Promise<IRavenCommandResponse> {
    const queryOptions: IOptionsSet = {
      sort_hints: this.sortHints,
      sort_fields: this.sortFields,
      fetch: this.fetch,
      wait_for_non_stale_results: this.waitForNonStaleResults
    };

    const session: IDocumentSession = this.session;
    session.incrementRequestsCount();

    const conventions: DocumentConventions<IDocument> = session.conventions;
    const endTime: number = moment().unix() + conventions.timeout;
    const query: IndexQuery = new IndexQuery(this.queryBuilder, 0, 0, this.usingDefaultOperator, queryOptions);
    const queryCommand: QueryCommand = new QueryCommand(this.indexName, query, conventions, this.includes);

    return new Promise<IRavenCommandResponse>((resolve: PromiseResolve<IRavenCommandResponse>, reject: PromiseReject) => {
      const request = () => {
        this.requestsExecutor.execute(queryCommand)
          .catch((error: Error) => reject(error))
          .then((response: IRavenCommandResponse | null) => {
            if (TypeUtil.isNone(response)) {
              resolve({
                Results: [] as IDocument[],
                Includes: [] as string[]
              } as IRavenCommandResponse);
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