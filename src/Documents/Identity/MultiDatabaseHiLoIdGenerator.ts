import { MultiTypeHiLoIdGenerator } from "./MultiTypeHiLoIdGenerator";
import { DocumentStore } from "../DocumentStore";
import { IRavenObject } from "../../Types/IRavenObject";

export class MultiDatabaseHiLoIdGenerator {

    protected readonly _store: DocumentStore;

    private _generators: IRavenObject<MultiTypeHiLoIdGenerator> = {};

    constructor(store: DocumentStore) {
        this._store = store;
    }

    public generateDocumentId(database: string, entity: object): Promise<string> {
        return this._getGeneratorForDatabase(database || this._store.database)
            .generateDocumentId(entity);
    }

    protected _getGeneratorForDatabase(database: string): MultiTypeHiLoIdGenerator {
        if (!(database in this._generators)) {
            this._generators[database] = new MultiTypeHiLoIdGenerator(this._store, database);
        }

        return this._generators[database];
    }

    public async returnUnusedRange() {
        for (const [key, generator] of Object.entries(this._generators)) {
            await generator.returnUnusedRange();
        }
    }
}
