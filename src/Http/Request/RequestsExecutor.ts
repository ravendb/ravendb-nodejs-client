import * as Promise from 'bluebird';
import * as RequestPromise from 'request-promise';
import {ServerNode} from '../ServerNode';
import {RavenCommand, RavenCommandRequestOptions} from '../../Database/RavenCommand';
import {IDocument} from '../../Documents/IDocument';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {IRavenResponse} from "../../Database/RavenCommandResponse";
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
import {RavenException, InvalidOperationException, RequestException, AuthorizationException} from "../../Database/DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {DateUtil} from "../../Utility/DateUtil";
import {IResponse} from "../Response/IResponse";
import {StatusCodes, StatusCode} from "../Response/StatusCode";

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

    setTimeout(() => this.updateFailingNodesStatuses(), 60 * 1000);
    setTimeout(() => this.getReplicationTopology(), 1 * 1000);
  }

  public execute(command: RavenCommand): Promise<IRavenResponse | IRavenResponse[] | null | void> {
    if (!command.ravenCommand) {
      return Promise.reject(new InvalidOperationException('Not a valid command'));
    }

    return this.chooseNodeForRequest(command)
      .then((chosenNodeResponse: IChooseNodeResponse) => {
        let chosenNode = chosenNodeResponse.node;

        const execute: () => Promise<IRavenResponse | IRavenResponse[] | null | void> = () => {
          const startTime: number = DateUtil.timestampMs();
          const failNode: () => Promise<IRavenResponse | IRavenResponse[] | null | void> = () => {
            chosenNode.isFailed = true;
            command.addFailedNode(chosenNode);

            return this.chooseNodeForRequest(command)
              .then((chosenNodeResponse: IChooseNodeResponse) => {
                chosenNode = chosenNodeResponse.node;
                return execute();
              });
          };

          return RequestPromise(this.prepareCommand(command, chosenNode))
            .catch(failNode)
            .finally(() => {
              chosenNode.addResponseTime(DateUtil.timestampMs() - startTime);
            })
            .then((response: IResponse): Promise<IRavenResponse | IRavenResponse[] | null | void> | (IRavenResponse | IRavenResponse[] | null | void) => {
              let commandResponse: IRavenResponse | IRavenResponse[] | null | void = null;
              const code: StatusCode = response.statusCode;
              const isServerError: boolean = [
                StatusCodes.RequestTimeout,
                StatusCodes.BadGateway,
                StatusCodes.GatewayTimeout,
                StatusCodes.ServiceUnavailable
              ].includes(code);

              if (StatusCodes.isNotFound(code) || (isServerError && command.avoidFailover)) {
                delete response.body;
              } else {
                if (isServerError) {
                  return failNode();
                }

                if (StatusCodes.isForbidden(code)) {
                  return Promise.reject(new AuthorizationException(
                    StringUtil.format(
                      'Forbidden access to {url}. Make sure you\'re using the correct api-key.',
                      chosenNode
                    )
                  ));
                }

                if ([StatusCodes.Unauthorized, StatusCodes.PreconditionFailed]
                    .includes(response.statusCode)
                ) {
                  if (!this._apiKey) {
                    return Promise.reject(StringUtil.format(
                      'Got unauthorized response for {url}. Please specify an api-key.',
                      chosenNode
                    ));
                  }

                  command.increaseAuthenticationRetries();

                  if (command.authenticationRetries > 1) {
                    return Promise.reject(StringUtil.format(
                      'Got unauthorized response for {url} after trying to authenticate using specified api-key.',
                      chosenNode
                    ));
                  }

                  this.handleUnauthorized(chosenNode);
                  return execute();
                }
              }

              try {
                commandResponse = command.setResponse(response);
              } catch (exception) {
                return Promise.reject(exception);
              }

              return commandResponse;
            });
        };

        return execute();
      });
  }

  protected prepareCommand(command: RavenCommand, node: ServerNode): RavenCommandRequestOptions {
    let options: RavenCommandRequestOptions;

    command.createRequest(node);
    options = command.toRequestOptions();
    Object.assign(options.headers, this.headers);

    if (!TypeUtil.isNone(node.currentToken)) {
      options.headers['Raven-Authorization'] = node.currentToken;
    }

    return options;
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
          .then((response?: IRavenResponse) => {
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
    },
    () => setTimeout(
      () => this.getReplicationTopology(), 60 * 5 * 1000
    ));
  }

  protected jsonToTopology(response: IRavenResponse): Topology {
    return new Topology(
      parseInt(response.Etag as string),
      this.jsonToServerNode(response.LeaderNode),
      response.ReadBehavior as ReadBehavior,
      response.WriteBehavior as WriteBehavior,
      response.Nodes.map((jsonNode) => this.jsonToServerNode(jsonNode)),
      ('SLA' in response) ? parseFloat(response.SLA.RequestTimeThresholdInMilliseconds) / 1000 : 0
    );
  }

  protected jsonToServerNode(json: IHash): ServerNode {
    return new ServerNode(json.Url, json.Database, json.ApiKey || null);
  }

  protected updateFailingNodesStatuses(): void {
    this._lock.acquireNodesStatuses(this._initUrl, this._initDatabase,
    (done: ILockDoneCallback) => {
      const topology = this._topology;

      [topology.leaderNode].concat(topology.nodes || [])
        .filter((node?: ServerNode) => node instanceof ServerNode)
        .filter((node?: ServerNode) => node.isFailed)
        .forEach((node: ServerNode) => setTimeout(this
        .updateFailingNodeStatus(node), 5 * 1000));

      done();
    },
    () => setTimeout(
        () => this.updateFailingNodesStatuses(), 60 * 1000
    ));
  }

  protected updateFailingNodeStatus(node: ServerNode): void {
    const command: GetTopologyCommand = new GetTopologyCommand();
    const startTime: number = DateUtil.timestampMs();

    RequestPromise(this.prepareCommand(command, node))
      .then((response: IResponse) => {
        if (StatusCodes.isOk(response.statusCode)) {
          node.isFailed = false;
        }

        if ([StatusCodes.Unauthorized, StatusCodes.PreconditionFailed]
            .includes(response.statusCode)
        ) {
          this.handleUnauthorized(node, false);
        }
      })
      .finally(() => {
        node.addResponseTime(DateUtil.timestampMs() - startTime);

        if (node.isFailed) {
          setTimeout(this.updateFailingNodeStatus(node), 5 * 1000);
        }
      });
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