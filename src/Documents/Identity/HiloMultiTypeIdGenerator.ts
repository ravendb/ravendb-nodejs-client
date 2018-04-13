import { IHiloIdGenerator } from "./IHiloIdGenerator";
import { HiloIdGenerator } from "./HiloIdGenerator";
import { IDocumentStore } from "../Documents/IDocumentStore";
import { AbstractHiloIdGenerator } from "./AbstractHiloIdGenerator";
import * as semaphore from "semaphore";
import * as BluebirdPromise from "bluebird";
import { acquireSemaphore } from "../Utility/SemaphoreUtil";

export class HiloMultiTypeIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {
    private _sem: semaphore.Semaphore;

    constructor(store: IDocumentStore, dbName?: string) {
        super(store, dbName);
        this._sem = semaphore();
    }

    public generateDocumentId(entity: object, documentType?: string): BluebirdPromise<string> {
        let tag: string = this.conventions.getCollectionName(documentType);

        if (this.conventions.emptyCollection === tag) {
            tag = null;
        }

        return this._createGeneratorForTag(tag)
            .then((generator: IHiloIdGenerator) =>
                generator.generateDocumentId()
            );
    }

    protected _createGeneratorForTag(tag: string): BluebirdPromise<IHiloIdGenerator> {
        const acquiredSem = acquireSemaphore(this._sem);

        return BluebirdPromise.resolve(acquiredSem.promise)
            .then(() => {
                let generator: IHiloIdGenerator = this.generators[tag];

                if (!generator) {
                    generator = this.generators[tag] = new HiloIdGenerator
                        (this.store, this.dbName, tag);
                }

                return generator;
            })
            .finally(() => acquiredSem.dispose());
    }
}
