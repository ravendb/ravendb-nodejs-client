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
  private _database: string;
  private _url: string;
  private _clusterTag?: string = null;
  private _serverRole: string;

  public constructor(opts?: { database: string, url: string }) {
    if (opts) {
      this._database = this.database;
      this._url = this.url;
    }
  }

  public get database(): string {
    return this._database;
  }

  public set database(value) {
    this._database = value;
  }

  public get clusterTag(): string {
    return this._clusterTag;
  }

  public set clusterTag(value) {
    this.clusterTag = value;
  }

  public get url(): string {
    return this._url;
  }

  public set url(value) {
    this._url = value;
  }

  public get serverRole(): string {
    return this._serverRole;
  }

  public set serverRole(value) {
    this._serverRole = value;
  }

  public get isSecure(): boolean {
    return UriUtility.isSecure(this.url);
  }

  public fromJson(json: object): void {
    const from: IRavenObject = json as IRavenObject;

    this._url = from.Url;
    this._database = from.Database || null;
    this._clusterTag = from.ClusterTag || null;
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