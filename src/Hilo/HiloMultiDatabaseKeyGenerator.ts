import {IHiloKeyGenerator} from './IHiloKeyGenerator';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {AbstractHiloKeyGenerator} from './AbstractHiloKeyGenerator';
import {DocumentID, IDocument} from '../Documents/IDocument';
import {IDCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';

export class HiloMultiDatabaseKeyGenerator extends AbstractHiloKeyGenerator implements IHiloKeyGenerator {
  constructor(store: IDocumentStore) {
    super(store);
  }

  public generateDocumentKey(dbName: string, entity: IDocument, callback?: IDCallback): Promise<DocumentID> {
    return new Promise<DocumentID>(() => {});
  }

  returnUnusedRange(): void {

  }
}
