import {IJsonSerializable} from '../Json/IJsonSerializable';
import {DocumentKey} from '../Documents/IDocument';
import {IMetadata} from './Metadata';
import {RequestMethod} from "../Http/Request/RequestMethod";

export abstract class RavenCommandData implements IJsonSerializable {
  private readonly _command: boolean = true;
  protected method: RequestMethod;
  protected key: DocumentKey;
  protected etag?: number = null;
  protected metadata?: IMetadata = null;
  protected additionalData?: Object = null;

  constructor(key: DocumentKey, etag?: number, metadata?: IMetadata) {
    this.key = key;
    this.etag = etag;
    this.metadata = metadata;
  }

  public get command(): boolean {
    return this._command;
  }

  public abstract toJson(): Object;
}