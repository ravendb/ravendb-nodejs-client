import {IHiloKeyGenerator} from './IHiloKeyGenerator';
import {HiloMultiTypeKeyGenerator} from './HiloMultiTypeKeyGenerator';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {AbstractHiloKeyGenerator} from './AbstractHiloKeyGenerator';
import {DocumentKey, IDocument, IDocumentType} from '../Documents/IDocument';
import * as Promise from 'bluebird';

export class HiloMultiDatabaseKeyGenerator extends AbstractHiloKeyGenerator implements IHiloKeyGenerator {
  constructor(store: IDocumentStore) {
    super(store);
  }

  public generateDocumentKey(entity: IDocument, documentType?: IDocumentType, dbName?: string): Promise<DocumentKey> {
    return this
      .getGeneratorForDatabase(dbName || this.store.database)
      .generateDocumentKey(entity, documentType);
  }

  protected getGeneratorForDatabase(dbName: string): IHiloKeyGenerator {
    if (!(dbName in this.generators)) {
      this.generators[dbName] = new HiloMultiTypeKeyGenerator(this.store, dbName);
    }

    return this.generators[dbName];
  }
}
