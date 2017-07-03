import {RavenCommandData} from '../../RavenCommandData';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonSerializable} from "../../../Json/IJsonSerializable";

export class DeleteCommandData extends RavenCommandData implements IJsonSerializable {
  constructor(id: string, etag?: number) {
    super(id, etag);

    this.type = RequestMethods.Delete;
  }
}
