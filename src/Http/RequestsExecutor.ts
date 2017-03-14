import {ServerNode} from './ServerNode';
import {RavenCommand} from '../Database/RavenCommand';
import {IDocument} from '../Documents/IDocument';
import {DocumentConventions} from '../Documents/Conventions/DocumentConventions';
import * as Promise from 'bluebird';

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export class RequestMethods {
  public static readonly Get: RequestMethod = 'GET';
  public static readonly Post: RequestMethod = 'POST';
  public static readonly Put: RequestMethod = 'PUT';
  public static readonly Patch: RequestMethod = 'PATCH';
  public static readonly Delete: RequestMethod = 'DELETE';
  public static readonly Options: RequestMethod = 'OPTIONS';
}

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

  execute(command: RavenCommand): Promise<Object> {
    return new Promise<Object>((resolve: Object) => {});
  }
}