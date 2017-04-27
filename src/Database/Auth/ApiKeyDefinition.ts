import {IJsonSerializable} from "../../Json/IJsonSerializable";
import {ResourcesAccessModes, AccessMode} from "./AccessMode";
import {ArrayUtil} from "../../Utility/ArrayUtil";
import {InvalidOperationException} from "../DatabaseExceptions";

export class ApiKeyDefinition implements IJsonSerializable {
  protected enabled: boolean = true;
  protected secret?: string = null;
  protected serverAdmin: boolean = false;
  protected resourcesAccessMode?: ResourcesAccessModes;

  constructor(enabled: boolean = true, secret?: string, serverAdmin: boolean = false, resourcesAccessMode?: ResourcesAccessModes) {
    if (resourcesAccessMode) {
      ArrayUtil.mapObject(resourcesAccessMode, (mode: AccessMode, resource: string) => {
        if (!resource.startsWith('db/')) {
          throw new InvalidOperationException('Resource name in ApiKeyDefinition should stars with "db/"');
        }
      })
    }

    this.enabled = enabled;
    this.secret = secret;
    this.serverAdmin = serverAdmin;
    this.resourcesAccessMode = resourcesAccessMode;
  }

  public toJson(): Object {
    const resourcesAccessModeJSON = this.resourcesAccessMode
      ? (this.resourcesAccessMode as Object) : {};

    return {
      "Enabled": this.enabled,
      "ResourcessAccessMode": resourcesAccessModeJSON,
      "Secret": this.secret,
      "ServerAdmin": this.serverAdmin
    };
  }
}