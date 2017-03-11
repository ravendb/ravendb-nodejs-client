import {IDocument} from '../IDocument';
import * as pluralize from 'pluralize';

export enum Failover {
  FailImmediately = 0,
  AllowReadsFromSecondaries = 1,
  AllowReadsFromSecondariesAndWritesToSecondaries = 3,
  ReadFromAllDervers = 1024
}

export class DocumentConventions<T extends IDocument> {
  readonly maxNumberOfRequestPerSession: number = 30;
  readonly maxIdsToCatch: number = 32;
  readonly timeout: number = 30;
  readonly failoverBehavior: number = Failover.AllowReadsFromSecondaries;
  readonly defaultUseOptimisticConcurrency:boolean = false;
  readonly maxLengthOfQueryUsingGetUrl = 1024 + 512;
  readonly identityPartsSeparator = "/";
  private _systemDatabase: string = "system";
  private _documentEntityClass: { new(): T; };

  constructor(documentEntityClass: { new(): T; }) {
    this._documentEntityClass = documentEntityClass;
  }

  public get documentEntity(): string {
    return this._documentEntityClass.name;
  }

  public get documentEntityName(): string {
     return this.documentEntity.toLowerCase();
  }

  public get documentsCollectionName(): string {
    return pluralize(this.documentEntityName);
  }

  public get systemDatabase(): string {
    return this._systemDatabase;
  }
}