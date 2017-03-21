import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";

export class QueryCommand extends RavenCommand {
  public createRequest(serverNode: ServerNode): void {
  }

  public setResponse(response: IResponse): IRavenCommandResponse | null | void {
  }
}