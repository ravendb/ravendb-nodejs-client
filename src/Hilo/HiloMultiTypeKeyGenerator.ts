import {IHiloKeyGenerator} from './IHiloKeyGenerator';
import {HiloKeyGenerator} from './HiloKeyGenerator';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {AbstractHiloKeyGenerator} from './AbstractHiloKeyGenerator';
import {DocumentID, IDocument} from '../Documents/IDocument';
import {IDCallback} from '../Utility/Callbacks';
import {StringUtil} from '../Utility/StringUtil';
import * as Promise from 'bluebird';
import * as AsyncLock from 'async-lock';

export class HiloMultiTypeKeyGenerator extends AbstractHiloKeyGenerator implements IHiloKeyGenerator {
  private _lock: AsyncLock;

  constructor(store: IDocumentStore, dbName?: string) {
    super(store, dbName);
    this._lock = new AsyncLock();
  }

  public generateDocumentKey(entity: IDocument, callback?: IDCallback): Promise<DocumentID> {
    const tag: string = this.conventions.documentEntityName;

    return this.createGeneratorForTag(tag)
      .then((generator: IHiloKeyGenerator) =>
        generator.generateDocumentKey()
      );
  }

  protected createGeneratorForTag(tag: string): Promise<IHiloKeyGenerator> {
    return new Promise<IHiloKeyGenerator>((resolve) => this._lock.acquire(
      StringUtil.format('lock:generator:tag:{0}', tag), () => {
        let generator: IHiloKeyGenerator = this.generators[tag];

        if (!generator) {
          generator = this.generators[tag] = new HiloKeyGenerator
            (this.store, this.dbName, tag);
        }

        return generator;
      })
      .then((generator: IHiloKeyGenerator) =>
        resolve(generator)
      )
    );
  }
}
