import {ServerNode} from './ServerNode';
import {IDocument} from '../Documents/IDocument';
import {DocumentConventions} from '../Documents/Conventions/DocumentConventions';

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
}