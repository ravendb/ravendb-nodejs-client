import {TypeUtil} from "../Utility/TypeUtil";
import {IJsonConvertible} from "../Typedef/Contracts";
import {IRavenObject} from "../Typedef/IRavenObject";
import {UriUtility} from "../Http/UriUtility";

export class ServerNodeRole {
  public static NONE = "NONE";
  public static PROMOTABLE = "PROMOTABLE";
  public static MEMBER = "MEMBER";
  public static REHAB = "REHAB";
}

export class ServerNode implements IJsonConvertible {
  public database: string;
  public url: string;
  public clusterTag?: string = null;
  public serverRole: string;

  public constructor(opts?: { database: string, url: string }) {
    if (opts) {
      this.database = opts.database;
      this.url = opts.url;
    }
  }

  public get isSecure(): boolean {
    return UriUtility.isSecure(this.url);
  }

  public fromJson(json: object): void {
    const from: IRavenObject = json as IRavenObject;

    this.url = from.Url;
    this.database = from.Database || null;
    this.clusterTag = from.ClusterTag || null;
  }

  public static fromJson(json: object): ServerNode {
    const node = new ServerNode({
      database: "",
      url: ""
    });

    node.fromJson(json);
    return node;
  }

  // TODO what to do with equals() and hashCode() overrides
}