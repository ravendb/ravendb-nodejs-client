import {IHiloKeyGenerator} from './IHiloKeyGenerator';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {AbstractHiloKeyGenerator} from './AbstractHiloKeyGenerator';
import {DocumentID, IDocument} from '../Documents/IDocument';
import {IDCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';

export class HiloMultiTypeKeyGenerator extends AbstractHiloKeyGenerator implements IHiloKeyGenerator {
  constructor(store: IDocumentStore, dbName?: string) {
    super(store, dbName);
  }

  public generateDocumentKey(entity: IDocument, callback?: IDCallback): Promise<DocumentID> {
    return new Promise<DocumentID>(() => {});
  }

  returnUnusedRange(): void {

  }
}
