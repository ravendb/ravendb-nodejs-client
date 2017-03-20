import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from '../../Http/Request/RequestMethod';
import {RavenCommand} from '../../Database/RavenCommand';
import {IRavenCommandResponse} from "../../Database/IRavenCommandResponse";
import {IResponse} from "../../Http/IResponse";

export class HiloReturnCommand extends RavenCommand {
  protected tag: string;
  protected last: number;
  protected end: number;

  constructor(tag: string, last: number, end: number) {
    super(null, RequestMethods.Put);
    this.tag = tag;
    this.last = last;
    this.end = end;
  }

  public createRequest(serverNode: ServerNode): void {

  }

  public setResponse(response: IResponse): IRavenCommandResponse | null | void {

  }
}