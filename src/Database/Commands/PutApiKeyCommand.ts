import {RavenCommand} from "../RavenCommand";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ServerNode} from "../../Http/ServerNode";
import {StringUtil} from "../../Utility/StringUtil";
import {InvalidOperationException} from "../DatabaseExceptions";
import {ApiKeyDefinition} from "../Auth/ApiKeyDefinition";

export class PutApiKeyCommand extends RavenCommand {
  protected name: string;
  protected apiKey: ApiKeyDefinition;

  constructor(name: string, apiKey: ApiKeyDefinition) {
    super('', RequestMethods.Put);

    if (!name) {
      throw new InvalidOperationException('Api key name isn\'t set');
    }

    if (!apiKey) {
      throw new InvalidOperationException('Api key definition isn\'t set');
    }

    if (!(apiKey instanceof ApiKeyDefinition)) {
      throw new InvalidOperationException('Api key definition mus be an instance of ApiKeyDefinition');
    }

    this.name = name;
    this.apiKey = apiKey;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {name: this.name};
    this.payload = this.apiKey.toJson();
    this.endPoint = StringUtil.format('{url}/admin/api-keys', serverNode);
  }
}