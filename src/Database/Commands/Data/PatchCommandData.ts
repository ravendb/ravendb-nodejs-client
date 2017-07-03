import * as _ from 'lodash';
import {RavenCommandData} from '../../RavenCommandData';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonSerializable} from "../../../Json/IJsonSerializable";
import {PatchRequest} from "../../../Http/Request/PatchRequest";
import {IRavenObject} from "../../IRavenObject";
import {TypeUtil} from "../../../Utility/TypeUtil";

export class PatchCommandData extends RavenCommandData implements IJsonSerializable {
  protected scriptedPatch: PatchRequest;
  protected patchIfMissing?: PatchRequest = null;
  protected additionalData?: IRavenObject = null;
  protected debugMode: boolean = false;

  constructor(id: string, scriptedPatch: PatchRequest, etag?: number,
    patchIfMissing?: PatchRequest) {
    super(id, etag);

    this.type = RequestMethods.Patch;
    this.scriptedPatch = scriptedPatch;
    this.patchIfMissing = patchIfMissing;
  }

  public toJson(): object {
    let json: object = _.assign(super.toJson(), {
      "Patch": this.scriptedPatch.toJson()
    });
    
    if (TypeUtil.isNone(this.etag)) {
      delete json['Etag'];
    }

    if (!TypeUtil.isNone(this.patchIfMissing)) {
      _.assign(json, {PatchIfMissing: this.patchIfMissing.toJson()});
    }

    return json;
  }
}
