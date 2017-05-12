import {IJsonSerializable} from '../Json/IJsonSerializable';
import {RequestMethod} from "../Http/Request/RequestMethod";

export abstract class RavenCommandData implements IJsonSerializable {
  private readonly _command: boolean = true;
  protected method: RequestMethod;
  protected key: string;
  protected etag?: number = null;
  protected metadata?: Object = null;
  protected additionalData?: Object = null;

  constructor(key: string, etag?: number, metadata?: Object) {
    this.key = key;
    this.etag = etag;
    this.metadata = metadata;
  }

  public get command(): boolean {
    return this._command;
  }

  public abstract toJson(): Object;
}