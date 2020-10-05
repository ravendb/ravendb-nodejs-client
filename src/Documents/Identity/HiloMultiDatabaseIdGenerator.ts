import { IHiloIdGenerator } from "./IHiloIdGenerator";
import { HiloMultiTypeIdGenerator } from "./HiloMultiTypeIdGenerator";
import { AbstractHiloIdGenerator } from "./AbstractHiloIdGenerator";
import { IDocumentStore } from "../IDocumentStore";

export class HiloMultiDatabaseIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {

    constructor(store: IDocumentStore) {
        super(store);
    }

    public generateDocumentId(database: string, entity: object): Promise<string> {
        return this._getGeneratorForDatabase(database || this._store.database)
            .generateDocumentId(entity);
    }

    protected _getGeneratorForDatabase(database: string): IHiloIdGenerator {
        if (!(database in this._generators)) {
            this._generators[database] = new HiloMultiTypeIdGenerator(this._store, database);
        }

        return this._generators[database];
    }
}
