import * as _ from 'lodash';
import {RavenCommandData} from '../../RavenCommandData';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonSerializable} from "../../../Json/IJsonSerializable";
import {PatchRequest} from "../../../Http/Request/PatchRequest";
import {IRavenObject} from "../../../Database/IRavenObject";
import {TypeUtil} from "../../../Utility/TypeUtil";

export class PatchCommandData extends RavenCommandData implements IJsonSerializable {
  protected scriptedPatch: PatchRequest;
  protected patchIfMissing?: PatchRequest = null;
  protected additionalData?: IRavenObject = null;
  protected debugMode: boolean = false;

  constructor(key: string, scriptedPatch: PatchRequest, etag?: number, metadata?: object,
    patchIfMissing?: PatchRequest, additionalData?: IRavenObject, debugMode: boolean = false) {
    super(key, etag, metadata || {});

    this.method = RequestMethods.Patch;
    this.scriptedPatch = scriptedPatch;
    this.patchIfMissing = patchIfMissing;
    this.additionalData = additionalData;
    this.debugMode = debugMode
  }

  public toJson(): object {
    let json: object = {
      "Key": this.key, 
      "Method": this.method,
      "Patch": this.scriptedPatch.toJson(),
      "DebugMode": this.debugMode,
      "object": this.metadata
    };
    
    if (!TypeUtil.isNone(this.etag)) {
      _.assign(json, {Etag: this.etag});
    }

    if (!TypeUtil.isNone(this.patchIfMissing)) {
      _.assign(json, {PatchIfMissing: this.patchIfMissing.toJson()});
    }

    return json;
  }
}
