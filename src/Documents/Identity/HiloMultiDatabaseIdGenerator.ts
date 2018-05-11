import * as BluebirdPromise from "bluebird";
import {IHiloIdGenerator} from "./IHiloIdGenerator";
import {HiloMultiTypeIdGenerator} from "./HiloMultiTypeIdGenerator";
import {AbstractHiloIdGenerator} from "./AbstractHiloIdGenerator";
import { IDocumentStore } from "../IDocumentStore";

export class HiloMultiDatabaseIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {

  constructor(store: IDocumentStore) {
    super(store);
  }

  public generateDocumentId(dbName: string, entity: object): Promise<string> {
    return this._getGeneratorForDatabase(this._store.database)
      .generateDocumentId(entity);
  }

  protected _getGeneratorForDatabase(dbName: string): IHiloIdGenerator {
    if (!(dbName in this._generators)) {
      this._generators[dbName] = new HiloMultiTypeIdGenerator(this._store, dbName);
    }

    return this._generators[dbName];
  }
}
