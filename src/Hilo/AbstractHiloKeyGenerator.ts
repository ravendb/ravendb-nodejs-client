import {IHiloKeyGenerator} from './IHiloKeyGenerator';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {DocumentConventions} from '../Documents/Conventions/DocumentConventions';
import {DocumentKey, IDocument} from '../Documents/IDocument';
import {EntityKeyCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';
import {IHashCollection} from "../Utility/IHashCollection";

export abstract class AbstractHiloKeyGenerator implements IHiloKeyGenerator {
  protected generators: IHashCollection<IHiloKeyGenerator> = {};
  protected store: IDocumentStore;
  protected conventions: DocumentConventions<IDocument>;
  protected dbName: string;
  protected tag: string;

  constructor(store: IDocumentStore, dbName?: string, tag?: string) {
    this.tag = tag;
    this.store = store;
    this.conventions = store.conventions;
    this.dbName = dbName || store.database;
  }

  public abstract generateDocumentKey(...args: (IDocument | EntityKeyCallback | string)[]): Promise<DocumentKey>;

  public returnUnusedRange(): Promise<void> {
    return Promise
      .all(Object.keys(this.generators)
        .map((key: string): IHiloKeyGenerator => this.generators[key])
        .map((generator: IHiloKeyGenerator): Promise<void> => generator.returnUnusedRange()))
      .then((): void => {});
  };
}
