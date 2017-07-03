import {IJsonSerializable} from '../Json/IJsonSerializable';
import {RequestMethod} from "../Http/Request/RequestMethod";

export abstract class RavenCommandData implements IJsonSerializable {
  private readonly _command: boolean = true;
  protected type: RequestMethod;
  protected id: string;
  protected etag?: number = null;
  protected additionalData?: object = null;

  constructor(id: string, etag?: number) {
    this.id = id;
    this.etag = etag;
  }

  public get command(): boolean {
    return this._command;
  }

  public get documentId(): string {
    return this.id;
  }

  public toJson(): object {
    return {
      "Type": this.type,
      "Id": this.documentId,
      "Etag": this.etag
    };
  }
}