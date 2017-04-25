import {assign} from 'lodash';
import {RavenCommandData} from '../../RavenCommandData';
import {DocumentKey} from '../../../Documents/IDocument';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonSerializable} from "../../../Json/IJsonSerializable";
import {PatchRequest} from "../../../Http/Request/PatchRequest";
import {IMetadata} from "../../Metadata";
import {IHash} from "../../../Utility/Hash";
import {TypeUtil} from "../../../Utility/TypeUtil";

export class PatchCommandData extends RavenCommandData implements IJsonSerializable {
  protected scriptedPatch: PatchRequest;
  protected patchIfMissing?: PatchRequest = null;
  protected additionalData?: IHash = null;
  protected debugMode: boolean = false;

  constructor(key: DocumentKey, scriptedPatch: PatchRequest, etag?: number, metadata?: IMetadata,
    patchIfMissing?: PatchRequest, additionalData?: IHash, debugMode: boolean = false) {
    super(key, etag, metadata || {});

    this.method = RequestMethods.Patch;
    this.scriptedPatch = scriptedPatch;
    this.patchIfMissing = patchIfMissing;
    this.additionalData = additionalData;
    this.debugMode = debugMode
  }

  public toJson(): Object {
    let json: Object = {
      "Key": this.key, 
      "Method": this.method,
      "Patch": this.scriptedPatch.toJson(),
      "DebugMode": this.debugMode,
      "Metadata": this.metadata
    };
    
    if (!TypeUtil.isNone(this.etag)) {
      assign(json, {Etag: this.etag});
    }

    if (!TypeUtil.isNone(this.patchIfMissing)) {
      assign(json, {PatchIfMissing: this.patchIfMissing.toJson()});
    }

    return json;
  }
}
