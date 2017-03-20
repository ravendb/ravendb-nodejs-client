import {IDocument} from "../IDocument";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocumentSession} from "./IDocumentSession";
import {RequestsExecutor} from "../../Http/Request/RequestsExecutor";
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {EntityCallback, EntitiesArrayCallback, EntitiesCountCallback} from '../../Utility/Callbacks';
import {PromiseResolve, PromiseResolver} from '../../Utility/PromiseResolver';
import {EscapeQueryOption, EscapeQueryOptions} from "./EscapeQueryOptions";
import * as Promise from 'bluebird'

export class DocumentQuery implements IDocumentQuery {
  protected session: IDocumentSession;
  protected requestsExecutor: RequestsExecutor;

  constructor(session: IDocumentSession, requestsExecutor: RequestsExecutor) {
    this.session = session;
    this.requestsExecutor = requestsExecutor;
  }

  select(...args): IDocumentQuery {
    return this;
  }

  search(fieldName: string, searchTerms: string | string[], escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.RawQuery, boost: number = 1): IDocumentQuery {
    return this;
  }

  where(conditions: IDocumentQueryConditions): IDocumentQuery {
    return this;
  }

  whereEquals<V>(fieldName: string, value: V, escapeQueryOptions: EscapeQueryOption = EscapeQueryOptions.EscapeAll): IDocumentQuery {
    return this;
  }

  whereEndsWith<V>(fieldName: string, value: V): IDocumentQuery {
    return this;
  }

  whereStartsWith<V>(fieldName: string, value: V): IDocumentQuery {
    return this;
  }

  whereIn<V>(fieldName: string, values: V[]): IDocumentQuery {
    return this;
  }

  whereBetween<V>(fieldName: string, start: V, end: V): IDocumentQuery {
    return this;
  }

  whereBetweenOrEqual<V>(fieldName: string, start: V, end: V): IDocumentQuery {
    return this;
  }

  whereGreaterThan<V>(fieldName: string, value: V): IDocumentQuery {
    return this;
  }

  whereGreaterThanOrEqual<V>(fieldName: string, value: V): IDocumentQuery {
    return this;
  }

  whereLessThan<V>(fieldName: string, value: V): IDocumentQuery {
    return this;
  }

  whereLessThanOrEqual<V>(fieldName: string, value: V): IDocumentQuery {
    return this;
  }

  whereIsNull(fieldName: string): IDocumentQuery {
    return this;
  }

  whereNotNull(fieldName: string): IDocumentQuery {
    return this;
  }

  orderBy(fieldsNames: string|string[]): IDocumentQuery {
    return this;
  }

  orderByDescending(fieldsNames: string|string[]): IDocumentQuery {
    return this;
  }

  andAlso(): IDocumentQuery {
    return this;
  }

  orElse(): IDocumentQuery {
    return this;
  }

  addNot(): IDocumentQuery {
    return this;
  }

  boost(value): IDocumentQuery {
    return this;
  }

  first(callback?: EntityCallback<IDocument>): Promise<IDocument> {
    const result = this.session.create();

    return new Promise<IDocument>((resolve: PromiseResolve<IDocument>) =>
      PromiseResolver.resolve(result, resolve, callback)
    );
  }

  get(callback?: EntitiesArrayCallback<IDocument>): Promise<IDocument[]> {
    const result = [this.session.create()];

    return new Promise<IDocument[]>((resolve: PromiseResolve<IDocument[]>) =>
      PromiseResolver.resolve<IDocument[]>(result, resolve, callback)
    );
  }

  count(callback?: EntitiesCountCallback): Promise<number> {
    const result = 1;

    return new Promise<number>((resolve: PromiseResolve<number>) =>
      PromiseResolver.resolve(result, resolve, callback)
    );
  }
}