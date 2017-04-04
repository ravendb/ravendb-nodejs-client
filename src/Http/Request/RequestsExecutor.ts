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
import {IHash} from "../../Utility/Hash";
import {ReadBehavior} from "../../Documents/Conventions/ReadBehavior";
import {WriteBehavior} from "../../Documents/Conventions/WriteBehavior";
import {Lock} from "../../Lock/Lock";
import {ILockDoneCallback} from "../../Lock/LockCallbacks";
import {GetTopologyCommand} from "../../Database/Commands/GetTopologyCommand";
import {RavenException} from "../../Database/DatabaseExceptions";

export class RequestsExecutor {
  protected conventions?: DocumentConventions<IDocument>;
  protected headers: IHeaders;
  protected requestsCount: number = 0;
  protected topologyChangeCounter: number = 0;
  private _lock: Lock;
  private _authenticator: ApiKeyAuthenticator;
  private _topology: Topology;
  private _apiKey?: string = null;
  private _primary: boolean = false;
  private _unauthorizedHandlerInitialized: boolean = false;
  private _initUrl: string;
  private _initDatabase: string;

  constructor(url: string, database: string, apiKey?: string, conventions?: DocumentConventions<IDocument>) {
    const serverNode: ServerNode = new ServerNode(url, database, apiKey);

    this._apiKey = apiKey;
    this._initUrl = url;
    this._initDatabase = database;
    this.conventions = conventions;
    this._lock = Lock.getInstance();
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
    this._lock.acquireTopology(
      this._initUrl, this._initDatabase,
      (done: ILockDoneCallback) => {
        this.execute(new GetTopologyCommand())
          .catch((error: RavenException) => done(error))
          .then((response?: IRavenCommandResponse) => {
            if (response) {
              const newTopology = this.jsonToTopology(response);

              if (this._topology.etag < newTopology.etag) {
                this._topology = newTopology;
              }
            }

            done();
          });
    },() => setTimeout(
      () => this.getReplicationTopology(), 60 * 5
    ));
  }

  protected jsonToTopology(jsonResponse: IRavenCommandResponse): Topology {
    return new Topology(
      parseInt(jsonResponse.Etag as string),
      this.jsonToServerNode(jsonResponse.LeaderNode),
      jsonResponse.ReadBehavior as ReadBehavior,
      jsonResponse.WriteBehavior as WriteBehavior,
      jsonResponse.Nodes.map((jsonNode) => this.jsonToServerNode(jsonNode)),
      ('SLA' in jsonResponse) ? parseFloat(jsonResponse.SLA.RequestTimeThresholdInMilliseconds) / 1000 : 0
    );
  }

  protected jsonToServerNode(json: IHash): ServerNode {
    return new ServerNode(json.Url, json.Database, json.ApiKey || null);
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