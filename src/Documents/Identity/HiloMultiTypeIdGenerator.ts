import { IHiloIdGenerator } from "./IHiloIdGenerator";
import { HiloIdGenerator } from "./HiloIdGenerator";
import { IDocumentStore } from "../../Documents/IDocumentStore";
import { AbstractHiloIdGenerator } from "./AbstractHiloIdGenerator";
import * as semaphore from "semaphore";
import * as BluebirdPromise from "bluebird";
import { acquireSemaphore } from "../../Utility/SemaphoreUtil";

export class HiloMultiTypeIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {
    private readonly _sem: semaphore.Semaphore;

    constructor(store: IDocumentStore, dbName?: string) {
        super(store, dbName);
        this._sem = semaphore();
    }

    public generateDocumentId(entity: object, documentType?: string): Promise<string> {
        const entityType = this._conventions.findEntityType(documentType);
        const typeTagName: string = entityType
            ? this._conventions.getCollectionNameForType(entityType)
            : this._conventions.getCollectionNameForEntity(entity);

        if (!typeTagName) {
            return Promise.resolve(null);
        }

        return Promise.resolve()
            .then(() => this._conventions.transformClassCollectionNameToDocumentIdPrefix(typeTagName))
            .then(tag => this._createGeneratorForTag(tag))
            .then((generator: IHiloIdGenerator) => generator.generateDocumentId());
    }

    protected _createGeneratorForTag(tag: string): Promise<IHiloIdGenerator> {
        const acquiredSem = acquireSemaphore(this._sem);

        const result = BluebirdPromise.resolve(acquiredSem.promise)
            .then(() => {
                let generator: IHiloIdGenerator = this._generators[tag];

                if (!generator) {
                    generator = this._generators[tag] =
                        new HiloIdGenerator(this._store, this._dbName, tag);
                }

                return generator;
            })
            .finally(() => acquiredSem.dispose());

        return Promise.resolve(result);
    }
}
