import {ServerNode} from '../ServerNode';
import {RavenCommand} from '../../Database/RavenCommand';
import {IDocument} from '../../Documents/IDocument';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import * as Promise from 'bluebird';
import {IRavenCommandResponse} from "../../Database/IRavenCommandResponse";
import {Topology} from "../Topology";
import {TypeUtil} from "../../Utility/TypeUtil";
import {IHeaders} from "../IHeaders";
import {ApiKeyAuthenticator} from "../../Database/Auth/ApiKeyAuthenticator";

export class RequestsExecutor {
  protected conventions?: DocumentConventions<IDocument>;
  protected headers: IHeaders;
  protected requestsCount: number = 0;
  protected topologyChangeCounter: number = 0;
  private _authenticator: ApiKeyAuthenticator;
  private _topology: Topology;
  private _apiKey?: string = null;
  private _primary: boolean = false;
  private _unauthorizedHandlerInitialized: boolean = false;

  constructor(url: string, database: string, apiKey?: string, conventions?: DocumentConventions<IDocument>) {
    const serverNode: ServerNode = new ServerNode(url, database, apiKey);

    this.conventions = conventions;
    this._apiKey = apiKey;
    this._authenticator = new ApiKeyAuthenticator();
    this._topology = new Topology(Number.MIN_SAFE_INTEGER, serverNode);
    this.headers = {
      "Accept": "application/json",
      "Has-Api-key": TypeUtil.isNone(apiKey) ? 'false' : 'true',
      "Raven-Client-Version": "4.0.0.0"
    };

    setTimeout(() => this.updateFailingNodesStatus(), 60);
    setTimeout(() => this.getReplicationTopology(), 1);
  }

  public execute(command: RavenCommand): Promise<IRavenCommandResponse> {
    return new Promise<IRavenCommandResponse>((resolve: IRavenCommandResponse) => ({} as IRavenCommandResponse));
  }

  protected getReplicationTopology(): void {
    Promise.resolve()
      .then(() => setTimeout(
        () => this.getReplicationTopology(), 60 * 5
      ));
  }

  protected updateFailingNodesStatus(): void {
    Promise.resolve()
      .then(() => setTimeout(
        () => this.updateFailingNodesStatus(), 60
    ));
  }

  protected handleUnauthorized(serverNode: ServerNode, shouldThrow: boolean = true): Promise<any> {
    return Promise.resolve()
      .then(() => {
        if (!this._unauthorizedHandlerInitialized) {
          this._unauthorizedHandlerInitialized = true;
          this.updateCurrentToken();
        }
      });
  }

  protected updateCurrentToken(): void {
    const topology: Topology = this._topology;
    const leader: ServerNode | null = topology.leaderNode;
    let nodes: ServerNode[] = topology.nodes;
    const setTimer: () => void = () => {
      setTimeout(() => this.updateCurrentToken(), 60 * 20);
    };

    if (!this._unauthorizedHandlerInitialized) {
      return setTimer();
    }

    if (!TypeUtil.isNone(leader)) {
      nodes = nodes.concat(leader as ServerNode);
    }

    Promise.all(nodes
      .map((node: ServerNode): Promise<any> => this
      .handleUnauthorized(node, false)))
      .then(() => setTimer());
  }
}