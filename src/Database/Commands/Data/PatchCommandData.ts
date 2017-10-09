import * as _ from 'lodash';
import {RavenCommandData} from '../../RavenCommandData';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonable} from "../../../Typedef/Contracts";
import {PatchRequest} from "../../../Http/Request/PatchRequest";
import {IRavenObject} from "../../../Typedef/IRavenObject";
import {TypeUtil} from "../../../Utility/TypeUtil";

export class PatchCommandData extends RavenCommandData implements IJsonable {
  protected scriptedPatch: PatchRequest;
  protected patchIfMissing?: PatchRequest = null;
  protected additionalData?: IRavenObject = null;
  protected debugMode: boolean = false;

  constructor(id: string, scriptedPatch: PatchRequest, changeVector?: string,
    patchIfMissing?: PatchRequest, debugMode?: boolean) {
    super(id, changeVector);

    this.type = RequestMethods.Patch;
    this.scriptedPatch = scriptedPatch;
    this.patchIfMissing = patchIfMissing;
    this.debugMode = debugMode;
  }

  public toJson(): object {
    let json: object = _.assign(super.toJson(), {
      "Patch": this.scriptedPatch.toJson(),
      "DebugMode": this.debugMode
    });
    
    if (!TypeUtil.isNull(this.patchIfMissing)) {
      _.assign(json, {PatchIfMissing: this.patchIfMissing.toJson()});
    }

    return json;
  }
}
