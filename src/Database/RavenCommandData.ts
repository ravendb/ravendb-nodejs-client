import {IJsonable} from '../Json/Contracts';
import {RequestMethod} from "../Http/Request/RequestMethod";

export abstract class RavenCommandData implements IJsonable {
  protected type: RequestMethod;
  protected id: string;
  protected etag?: number = null;

  constructor(id: string, etag?: number) {
    this.id = id;
    this.etag = etag;
  }

  public get documentId(): string {
    return this.id;
  }

  public toJson(): object {
    return {
      "Type": this.type,
      "Id": this.id,
      "Etag": this.etag
    };
  }
}