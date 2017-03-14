import {IHiloKeyGenerator} from './IHiloKeyGenerator';
import {HiloMultiTypeKeyGenerator} from './HiloMultiTypeKeyGenerator';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {AbstractHiloKeyGenerator} from './AbstractHiloKeyGenerator';
import {DocumentID, IDocument} from '../Documents/IDocument';
import {IDCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';

export class HiloMultiDatabaseKeyGenerator extends AbstractHiloKeyGenerator implements IHiloKeyGenerator {
  constructor(store: IDocumentStore) {
    super(store);
  }

  public generateDocumentKey(entity: IDocument, dbName?: string, callback?: IDCallback): Promise<DocumentID> {
    return this
      .getGeneratorForDatabase(dbName || this.store.database)
      .generateDocumentKey(entity, callback);
  }

  protected getGeneratorForDatabase(dbName: string): IHiloKeyGenerator {
    if (!(dbName in this.generators)) {
      this.generators[dbName] = new HiloMultiTypeKeyGenerator(this.store, dbName);
    }

    return this.generators[dbName];
  }
}
