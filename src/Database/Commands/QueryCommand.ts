import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {IResponse} from "../../Http/IResponse";

export class QueryCommand extends RavenCommand {
  protected createRequest(serverNode: ServerNode): void {
  }

  protected setResponse(response: IResponse): IRavenCommandResponse | null | void {
  }
}