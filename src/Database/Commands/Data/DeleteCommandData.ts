import {RavenCommandData} from '../../RavenCommandData';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonable} from "../../../Typedef/Contracts";

export class DeleteCommandData extends RavenCommandData implements IJsonable {
  constructor(id: string, changeVector?: string) {
    super(id, changeVector);

    this.type = RequestMethods.Delete;
  }
}
