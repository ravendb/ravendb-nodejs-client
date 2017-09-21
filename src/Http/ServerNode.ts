import {TypeUtil} from "../Utility/TypeUtil";
import {IJsonConvertible} from "../Typedef/Contracts";
import {IRavenObject} from "../Typedef/IRavenObject";

export class ServerNode implements IJsonConvertible {
  private _database: string;
  private _url: string;
  private _clusterTag?: string = null;
  private _responseTime: number[] = [];
  private _isRateSurpassed?: boolean = null;

  public static fromJson(json: object): ServerNode {
    const node: ServerNode = new (<typeof ServerNode>this)('', '');

    node.fromJson(json);
    return node;
  }

  constructor(url: string, database: string, clusterTag?: string) {
    this._url = url;
    this._database = database;
    this._clusterTag = clusterTag;
  }

  public get database(): string {
    return this._database;
  }

  public get clusterTag(): string {
    return this._clusterTag;
  }

  public get url(): string {
    return this._url;
  }

  public get ewma(): number {
    let ewma: number = 0;
    let divide: number = this._responseTime.length;

    if (0 === divide) {
      return ewma;
    }

    ewma = this._responseTime.reduce((total: number, time: number) => (total + time), 0);
    return (0 === ewma) ? 0 : ewma / divide;
  }

  public set responseTime(value: number) {
    this._responseTime[this._responseTime.length % 5] = value;
  }

  public isRateSurpassed(requestTimeSlaThresholdInMilliseconds): boolean {
    let koeff: number = .75;
    
    if (TypeUtil.isNull(this._isRateSurpassed)) {
      koeff += .25;
    }

    this._isRateSurpassed = this.ewma >= (koeff * requestTimeSlaThresholdInMilliseconds);
    return this._isRateSurpassed;
  }

  public fromJson(json: object): void {
    const from: IRavenObject = <IRavenObject>json;

    this._url = from.Url;
    this._database = from.Database || null;
    this._clusterTag = from.ClusterTag || null;
  }
}