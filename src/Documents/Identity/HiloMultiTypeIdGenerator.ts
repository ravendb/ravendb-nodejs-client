import { IHiloIdGenerator } from "./IHiloIdGenerator";
import { HiloIdGenerator } from "./HiloIdGenerator";
import { IDocumentStore } from "../../Documents/IDocumentStore";
import { AbstractHiloIdGenerator } from "./AbstractHiloIdGenerator";
import * as semaphore from "semaphore";
import * as BluebirdPromise from "bluebird";
import { acquireSemaphore } from "../../Utility/SemaphoreUtil";
import { CONSTANTS } from "../../Constants";

export class HiloMultiTypeIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {
    private _sem: semaphore.Semaphore;

    constructor(store: IDocumentStore, dbName?: string) {
        super(store, dbName);
        this._sem = semaphore();
    }

    public generateDocumentId(entity: object, documentType?: string): Promise<string> {
        const entityType = this.conventions.findKnownType(documentType);
        let tag: string = this.conventions.getCollectionNameForType(entityType);

        if (CONSTANTS.Documents.Metadata.EMPTY_COLLECTION === tag) {
            tag = null;
        }

        return this._createGeneratorForTag(tag)
            .then((generator: IHiloIdGenerator) => generator.generateDocumentId());
    }

    protected _createGeneratorForTag(tag: string): Promise<IHiloIdGenerator> {
        const acquiredSem = acquireSemaphore(this._sem);

        const result = BluebirdPromise.resolve(acquiredSem.promise)
            .then(() => {
                let generator: IHiloIdGenerator = this.generators[tag];

                if (!generator) {
                    generator = this.generators[tag] = new HiloIdGenerator
                        (this.store, this.dbName, tag);
                }

                return generator;
            })
            .finally(() => acquiredSem.dispose());
        
        return Promise.resolve(result);
    }
}
