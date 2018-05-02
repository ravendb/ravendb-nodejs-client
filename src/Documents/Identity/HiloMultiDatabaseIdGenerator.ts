import * as BluebirdPromise from "bluebird";
import {IHiloIdGenerator} from "./IHiloIdGenerator";
import {HiloMultiTypeIdGenerator} from "./HiloMultiTypeIdGenerator";
import {AbstractHiloIdGenerator} from "./AbstractHiloIdGenerator";
import { IDocumentStore } from "../IDocumentStore";

export class HiloMultiDatabaseIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {
  constructor(store: IDocumentStore) {
    super(store);
  }

  public nextId(dbName: string, entity: object, documentType?: string): Promise<string> {
    return this
      ._getGeneratorForDatabase(dbName || this.store.database)
      .nextId(entity, documentType);
  }

  protected _getGeneratorForDatabase(dbName: string): IHiloIdGenerator {
    if (!(dbName in this.generators)) {
      this.generators[dbName] = new HiloMultiTypeIdGenerator(this.store, dbName);
    }

    return this.generators[dbName];
  }
}
