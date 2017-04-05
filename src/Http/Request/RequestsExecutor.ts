import * as Promise from 'bluebird';
import {ServerNode} from '../ServerNode';
import {RavenCommand} from '../../Database/RavenCommand';
import {IDocument} from '../../Documents/IDocument';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {IRavenCommandResponse} from "../../Database/IRavenCommandResponse";
import {Topology} from "../Topology";
import {TypeUtil} from "../../Utility/TypeUtil";
import {IHeaders} from "../IHeaders";
import {ApiKeyAuthenticator} from "../../Database/Auth/ApiKeyAuthenticator";
import {IHash} from "../../Utility/Hash";
import {ReadBehavior, ReadBehaviors} from "../../Documents/Conventions/ReadBehavior";
import {WriteBehavior, WriteBehaviors} from "../../Documents/Conventions/WriteBehavior";
import {Lock} from "../../Lock/Lock";
import {ILockDoneCallback} from "../../Lock/LockCallbacks";
import {GetTopologyCommand} from "../../Database/Commands/GetTopologyCommand";
import {RavenException, InvalidOperationException, RequestException} from "../../Database/DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";

export interface IChooseNodeResponse {
  node: ServerNode,
  skippedNodes?: ServerNode[]
}

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
  private _topologyInitialized: boolean = false;
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

    setTimeout(() => this.updateFailingNodesStatus(), 60 * 1000);
    setTimeout(() => this.getReplicationTopology(), 1 * 1000);
  }

  public execute(command: RavenCommand): Promise<IRavenCommandResponse> {
    return new Promise<IRavenCommandResponse>((resolve: IRavenCommandResponse) => ({} as IRavenCommandResponse));
  }

  protected chooseNodeForRequest(command: RavenCommand): Promise<IChooseNodeResponse> {
    let response: IChooseNodeResponse;

    if (!this._topologyInitialized && !(command instanceof GetTopologyCommand)) {
      return Promise.delay(1 * 1000)
        .then((): Promise<IChooseNodeResponse> => this
        .chooseNodeForRequest(command)
      );
    }

    try {
      response = (command.isReadRequest)
        ? this.chooseNodeForRead(command)
        : this.chooseNodeForWrite(command);
    } catch (error) {
      return Promise.reject(error as RavenException) as Promise<IChooseNodeResponse>;
    }

    return Promise.resolve(response) as Promise<IChooseNodeResponse>;
  }

  protected chooseNodeForRead(command: RavenCommand): IChooseNodeResponse {
    const topology: Topology = this._topology;
    const leaderNode: ServerNode = topology.leaderNode;

    switch (topology.readBehavior) {
      case ReadBehaviors.LeaderOnly:
        if (!command.isFailedWithNode(leaderNode)) {
          return {node: leaderNode};
        }

        throw new RequestException(
          'Leader node failed to make this request. The current read behavior is set to LeaderOnly'
        );
      case ReadBehaviors.RoundRobin:
        let nonFailedNode: ServerNode;
        let skippedNodes: ServerNode[] = [];

        if ([leaderNode].concat(topology.nodes).some((node: ServerNode): boolean => {
            const nonFailed = !node.isFailed && !command.isFailedWithNode(node);

            nonFailed
               ? (nonFailedNode = node)
              : skippedNodes.push(node);

            return nonFailed
          })) {
          return {node: nonFailedNode, skippedNodes: skippedNodes};
        }

        throw new RequestException(
          'Tried all nodes in the cluster but failed getting a response'
        );
      case ReadBehaviors.LeaderWithFailoverWhenRequestTimeSlaThresholdIsReached:
        if (!leaderNode.isFailed && !command.isFailedWithNode(leaderNode)
          && leaderNode.isRateSurpassed(topology.sla)
        ) {
          return {node: leaderNode};
        }

        const nonFailedNodes: ServerNode[] = [leaderNode]
          .concat(topology.nodes || [])
          .filter((node: ServerNode): boolean => !node.isFailed)
          .sort((node: ServerNode, anoterNode: ServerNode): number =>
            node.ewma - anoterNode.ewma
          );

        if (nonFailedNodes.length > 0) {
          return {node: nonFailedNodes[0], skippedNodes: nonFailedNodes.slice(1)};
        }

        throw new RequestException(
          'Tried all nodes in the cluster but failed getting a response'
        );
      default:
        throw new InvalidOperationException(
          StringUtil.format('Invalid read behavior value: {readBehavior}', topology)
        );
    }
  }

  protected chooseNodeForWrite(command: RavenCommand): IChooseNodeResponse {
    const topology: Topology = this._topology;
    const leaderNode: ServerNode = topology.leaderNode;

    switch (topology.writeBehavior) {
      case WriteBehaviors.LeaderOnly:
        if (!command.isFailedWithNode(leaderNode)) {
          return {node: leaderNode};
        }

        throw new RequestException(
          'Leader node failed to make this request. The current write behavior is set to LeaderOnly'
        );
      case WriteBehaviors.LeaderWithFailover:
        let nonFailedNode: ServerNode;

        if ([leaderNode].concat(topology.nodes).some((node: ServerNode): boolean => {
          const nonFailed = !node.isFailed && !command.isFailedWithNode(node);

          if (nonFailed) {
            nonFailedNode = node;
          }

          return nonFailed
        })) {
          return {node: nonFailedNode};
        }

        throw new RequestException(
          'Tried all nodes in the cluster but failed getting a response'
        );
      default:
        throw new InvalidOperationException(
          StringUtil.format('Invalid write behavior value: {writeBehavior}', topology)
        );
    }
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

                if (!this._topologyInitialized) {
                  this._topologyInitialized = true;
                }
              }
            }

            done();
          });
    },() => setTimeout(
      () => this.getReplicationTopology(), 60 * 5 * 1000
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
        () => this.updateFailingNodesStatus(), 60 * 1000
    ));
  }

  protected handleUnauthorized(serverNode: ServerNode, shouldThrow: boolean = true): Promise<void> {
    return this._authenticator.authenticate(
      serverNode.url, serverNode.apiKey, this.headers
    )
    .then((token: Buffer): void => {
      serverNode.currentToken = token.toString();

      if (!this._unauthorizedHandlerInitialized) {
        this._unauthorizedHandlerInitialized = true;
        this.updateCurrentToken();
      }
    })
    .catch((error: RavenException) => {
      if (shouldThrow) {
        return Promise.reject(error) as Promise<void>;
      }

      return Promise.resolve()  as Promise<void>;
    });
  }

  protected updateCurrentToken(): void {
    const topology: Topology = this._topology;
    const leader: ServerNode | null = topology.leaderNode;
    let nodes: ServerNode[] = topology.nodes;
    const setTimer: () => void = () => {
      setTimeout(() => this.updateCurrentToken(), 60 * 20 * 1000);
    };

    if (!this._unauthorizedHandlerInitialized) {
      return setTimer();
    }

    if (!TypeUtil.isNone(leader)) {
      nodes = nodes.concat(leader as ServerNode);
    }

    Promise.all(nodes
      .map((node: ServerNode): Promise<void> => this
      .handleUnauthorized(node, false)))
      .then(() => setTimer());
  }
}