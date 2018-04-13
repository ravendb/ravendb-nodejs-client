import * as BluebirdPromise from "bluebird";
import {IHiloIdGenerator} from "./IHiloIdGenerator";
import {HiloMultiTypeIdGenerator} from "./HiloMultiTypeIdGenerator";
import {IDocumentStore} from "../Documents/IDocumentStore";
import {AbstractHiloIdGenerator} from "./AbstractHiloIdGenerator";

export class HiloMultiDatabaseIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {
  constructor(store: IDocumentStore) {
    super(store);
  }

  public generateDocumentId(entity: object, documentType?: string, dbName?: string): BluebirdPromise<string> {
    return this
      .getGeneratorForDatabase(dbName || this.store.database)
      .generateDocumentId(entity, documentType);
  }

  protected getGeneratorForDatabase(dbName: string): IHiloIdGenerator {
    if (!(dbName in this.generators)) {
      this.generators[dbName] = new HiloMultiTypeIdGenerator(this.store, dbName);
    }

    return this.generators[dbName];
  }
}
