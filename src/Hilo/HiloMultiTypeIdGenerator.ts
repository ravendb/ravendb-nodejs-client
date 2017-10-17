import {IHiloIdGenerator} from './IHiloIdGenerator';
import {HiloIdGenerator} from './HiloIdGenerator';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {AbstractHiloIdGenerator} from './AbstractHiloIdGenerator';
import {Lock} from '../Lock/Lock';
import * as BluebirdPromise from 'bluebird';

export class HiloMultiTypeIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {
  private _lock: Lock;

  constructor(store: IDocumentStore, dbName?: string) {
    super(store, dbName);
    this._lock = Lock.make();
  }

  public generateDocumentId(entity: object, documentType?: string): BluebirdPromise<string> {
    let tag: string = this.conventions.getCollectionName(documentType);

    if (this.conventions.emptyCollection === tag) {
      tag = null;
    }

    return this.createGeneratorForTag(tag)
      .then((generator: IHiloIdGenerator) =>
        generator.generateDocumentId()
      );
  }

  protected createGeneratorForTag(tag: string): BluebirdPromise<IHiloIdGenerator> {
    return new BluebirdPromise<IHiloIdGenerator>((resolve) => this._lock
      .acquire(() => {
        let generator: IHiloIdGenerator = this.generators[tag];

        if (!generator) {
          generator = this.generators[tag] = new HiloIdGenerator
            (this.store, this.dbName, tag);
        }

        return generator;
      })
      .then((generator: IHiloIdGenerator) =>
        resolve(generator)
      )
    );
  }
}
