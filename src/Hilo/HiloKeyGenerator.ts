import {IHiloKeyGenerator} from './IHiloKeyGenerator';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {DocumentConventions} from '../Documents/Conventions/DocumentConventions';
import {DocumentID, IDocument} from '../Documents/IDocument';
import {IDCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';

export class HiloKeyGenerator implements IHiloKeyGenerator {
  protected store: IDocumentStore;
  protected conventions: DocumentConventions<IDocument>;
  protected dbName: string;
  protected tag: string;

  constructor(tag: string, store: IDocumentStore, dbName: string) {
    this.tag = tag;
    this.store = store;
    this.conventions = store.conventions;
    this.dbName = dbName;
  }

  public generateDocumentKey(callback?: IDCallback): Promise<DocumentID> {
    return new Promise<DocumentID>(() => {});
  }

  returnUnusedRange(): void {

  }
}
