import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from '../../Http/Request/RequestMethod';
import {RavenCommand} from '../../Database/RavenCommand';
import {IRavenCommandResponse} from "../../Database/IRavenCommandResponse";
import {IResponse} from "../../Http/IResponse";

export class HiloNextCommand extends RavenCommand {
  protected tag: string;
  protected lastBatchSize: number;
  protected lastRangeAt: Date;
  protected identityPartsSeparator: string;
  protected lastRangeMax: number;

  constructor(tag: string, lastBatchSize: number, lastRangeAt: Date, identityPartsSeparator: string, lastRangeMax: number) {
    super(null, RequestMethods.Get);
    this.tag = tag;
    this.lastBatchSize = lastBatchSize;
    this.lastRangeAt = lastRangeAt;
    this.lastRangeMax = lastRangeMax;
    this.identityPartsSeparator = identityPartsSeparator;
  }

  public createRequest(serverNode: ServerNode): void {

  }

  public setResponse(response: IResponse): IRavenCommandResponse | null | void {

  }
}