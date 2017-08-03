import {IJsonable} from '../Json/Contracts';
import {RequestMethod} from "../Http/Request/RequestMethod";

export abstract class RavenCommandData implements IJsonable {
  protected type: RequestMethod;
  protected id: string;
  protected changeVector?: string = null;

  constructor(id: string, changeVector?: string) {
    this.id = id;
    this.changeVector = changeVector;
  }

  public get documentId(): string {
    return this.id;
  }

  public toJson(): object {
    return {
      "Type": this.type,
      "Id": this.id,
      "ChangeVector": this.changeVector
    };
  }
}