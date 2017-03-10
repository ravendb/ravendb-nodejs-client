import {IDocument} from "../IDocument";
import {IDocumentQuery} from "./IDocumentQuery";
import {IDocumentQueryConditions} from './IDocumentQueryConditions';
import {EntityCallback, EntitiesArrayCallback, EntitiesCountCallback} from '../../Utility/Callbacks';
import * as Promise from 'bluebird'

export class DocumentQuery implements IDocumentQuery {
  select(...args): IDocumentQuery {
    return this;
  }

  where(conditions: IDocumentQueryConditions): IDocumentQuery {
    return this;
  }

  whereEquals<V>(fieldName: string, value: V): IDocumentQuery {
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
    return new Promise<IDocument>(() => {});
  }

  get(callback?: EntitiesArrayCallback<IDocument>): Promise<IDocument[]> {
    return new Promise<IDocument[]>(() => {});
  }

  count(callback?: EntitiesCountCallback): Promise<number> {
    return new Promise<number>((resolve) => resolve(1));
  }
}