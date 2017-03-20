import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {IResponse} from "../../Http/IResponse";

export class GetTopologyCommand extends RavenCommand {
  public createRequest(serverNode: ServerNode): void {
  }

  public setResponse(response: IResponse): IRavenCommandResponse | null | void {
  }
}