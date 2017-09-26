import * as BluebirdPromise from 'bluebird';
import {IHiloIdGenerator} from './IHiloIdGenerator';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {DocumentConventions} from '../Documents/Conventions/DocumentConventions';
import {IRavenObject} from "../Typedef/IRavenObject";

export abstract class AbstractHiloIdGenerator implements IHiloIdGenerator {
  protected generators: IRavenObject<IHiloIdGenerator> = {};
  protected store: IDocumentStore;
  protected conventions: DocumentConventions;
  protected dbName: string;
  protected tag: string;

  constructor(store: IDocumentStore, dbName?: string, tag?: string) {
    this.tag = tag;
    this.store = store;
    this.conventions = store.conventions;
    this.dbName = dbName || store.database;
  }

  public abstract generateDocumentId(...args: (object | string)[]): BluebirdPromise<string>;

  public returnUnusedRange(): BluebirdPromise<void> {
    return BluebirdPromise
      .all(Object.keys(this.generators)
        .map((key: string): IHiloIdGenerator => this.generators[key])
        .map((generator: IHiloIdGenerator): BluebirdPromise<void> => generator.returnUnusedRange()))
      .then((): void => {});
  };
}
