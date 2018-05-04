import * as BluebirdPromise from "bluebird";
import {IHiloIdGenerator} from "./IHiloIdGenerator";
import {HiloMultiTypeIdGenerator} from "./HiloMultiTypeIdGenerator";
import {AbstractHiloIdGenerator} from "./AbstractHiloIdGenerator";
import { IDocumentStore } from "../IDocumentStore";

export class HiloMultiDatabaseIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {

  private _store: IDocumentStore;

  constructor(store: IDocumentStore) {
    super(store);
  }

  public generateDocumentId(dbName: string, entity: object): Promise<string> {
    return this._getGeneratorForDatabase(this._store.database)
      .generateDocumentId(entity);
  }

  protected _getGeneratorForDatabase(dbName: string): IHiloIdGenerator {
    if (!(dbName in this.generators)) {
      this.generators[dbName] = new HiloMultiTypeIdGenerator(this.store, dbName);
    }

    return this.generators[dbName];
  }
}
