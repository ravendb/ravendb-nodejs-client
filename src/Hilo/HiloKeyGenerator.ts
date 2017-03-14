import {IHiloKeyGenerator} from './IHiloKeyGenerator';
import {AbstractHiloKeyGenerator} from './AbstractHiloKeyGenerator';
import {DocumentID} from '../Documents/IDocument';
import {IDCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';

export class HiloKeyGenerator extends AbstractHiloKeyGenerator implements IHiloKeyGenerator {
  public generateDocumentKey(callback?: IDCallback): Promise<DocumentID> {
    return new Promise<DocumentID>(() => {});
  }
}
