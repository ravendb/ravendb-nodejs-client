import {ServerNode} from '../ServerNode';
import {RavenCommand} from '../../Database/RavenCommand';
import {IDocument} from '../../Documents/IDocument';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import * as Promise from 'bluebird';
import {IRavenCommandResponse} from "../../Database/IRavenCommandResponse";

export class RequestsExecutor {
  protected serverNode: ServerNode;
  protected conventions?: DocumentConventions<IDocument>;
  protected forceGetTopology: boolean = false;
  private _primaryServerNode: ServerNode;

  constructor(serverNode: ServerNode, conventions?: DocumentConventions<IDocument>, forceGetTopology: boolean = false) {
    this.conventions = conventions;
    this.forceGetTopology = forceGetTopology;
    this.serverNode = this._primaryServerNode = serverNode;
  }

  execute(command: RavenCommand): Promise<IRavenCommandResponse> {
    return new Promise<IRavenCommandResponse>((resolve: IRavenCommandResponse) => ({} as IRavenCommandResponse));
  }
}