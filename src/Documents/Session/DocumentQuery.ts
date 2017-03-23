import {IDocument} from "../IDocument";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocumentSession} from "./IDocumentSession";
import {RequestsExecutor} from "../../Http/Request/RequestsExecutor";
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {EntitiesArrayCallback} from '../../Utility/Callbacks';
import {PromiseResolve, PromiseResolver} from '../../Utility/PromiseResolver';
import {EscapeQueryOption, EscapeQueryOptions} from "./EscapeQueryOptions";
import * as Promise from 'bluebird'
import {LuceneValue, LuceneConditionValue} from "../Lucene/LuceneValue";
import {IRavenCommandResponse} from "../../Database/IRavenCommandResponse";
import {LuceneOperator} from "../Lucene/LuceneOperator";
import {LuceneBuilder} from "../Lucene/LuceneBuilder";

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
  protected usingDefaultOperator?: boolean = null;
  protected waitForNonStaleResults: boolean = false;

  constructor(session: IDocumentSession, requestsExecutor: RequestsExecutor, indexName?: string,  usingDefaultOperator
    ?: boolean, waitForNonStaleResults: boolean = false, includes?: string[], withStatistics: boolean = false
  ) {
    this.session = session;
    this.includes = includes;
    this.withStatistics = withStatistics;
    this.requestsExecutor = requestsExecutor;
    this.usingDefaultOperator = usingDefaultOperator;
    this.waitForNonStaleResults = waitForNonStaleResults;
    this.indexName = [(indexName || 'dynamic'), session.conventions.documentsCollectionName].join('/');
  }

  public select(...args): IDocumentQuery {
    return this;
  }

  public search(fieldName: string, searchTerms: string | string[], escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.RawQuery, boost: number = 1): IDocumentQuery {
    return this;
  }

  public where(conditions: IDocumentQueryConditions): IDocumentQuery {
    return this;
  }

  public whereEquals<V>(fieldName: string, value: V, escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll): IDocumentQuery {
    return this;
  }

  public whereEndsWith(fieldName: string, value: string): IDocumentQuery {
    return this;
  }

  public whereStartsWith(fieldName: string, value: string): IDocumentQuery {
    return this;
  }

  public whereIn<V extends LuceneValue>(fieldName: string, values: V[]): IDocumentQuery {
    return this;
  }

  public whereBetween<V extends LuceneValue>(fieldName: string, start: V, end: V): IDocumentQuery {
    return this;
  }

  public whereBetweenOrEqual<V extends LuceneValue>(fieldName: string, start: V, end: V): IDocumentQuery {
    return this;
  }

  public whereGreaterThan<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery {
    return this;
  }

  public whereGreaterThanOrEqual<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery {
    return this;
  }

  public whereLessThan<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery {
    return this;
  }

  public whereLessThanOrEqual<V extends LuceneValue>(fieldName: string, value: V): IDocumentQuery {
    return this;
  }

  public whereIsNull(fieldName: string): IDocumentQuery {
    return this;
  }

  public whereNotNull(fieldName: string): IDocumentQuery {
    return this;
  }

  public orderBy(fieldsNames: string|string[]): IDocumentQuery {
    return this;
  }

  public orderByDescending(fieldsNames: string|string[]): IDocumentQuery {
    return this;
  }

  public andAlso(): IDocumentQuery {
    return this;
  }

  public orElse(): IDocumentQuery {
    return this;
  }

  public addNot(): IDocumentQuery {
    return this;
  }

  public get(callback?: EntitiesArrayCallback<IDocument>): Promise<IDocument[]> {
    const result = [this.session.create()];

    return new Promise<IDocument[]>((resolve: PromiseResolve<IDocument[]>) =>
      PromiseResolver.resolve<IDocument[]>(result, resolve, callback)
    );
  }

  protected executeQuery(): Promise<IRavenCommandResponse> {
    return new Promise<IRavenCommandResponse>((resolve: PromiseResolve<IRavenCommandResponse>) => resolve([]));
  }

  protected buildLuceneCondition<T extends LuceneConditionValue>(fieldName: string, condition: T,
    operator?: LuceneOperator, escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll
  ): void {
    const luceneCondition: string = LuceneBuilder.buildCondition(fieldName, condition, operator, escapeQueryOptions);

    if ((this.queryBuilder.length > 0) && !this.queryBuilder.endsWith(' ')) {
      this.queryBuilder += ' ';
    }

    if (this.negate) {
      this.negate = false;
      this.queryBuilder += '-';
    }

    this.queryBuilder += luceneCondition;
  }
}