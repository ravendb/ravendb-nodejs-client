import * as BluebirdPromise from 'bluebird';
import * as RequestPromise from 'request-promise';
import {ServerNode} from '../ServerNode';
import {RavenCommand, RavenCommandRequestOptions} from '../../Database/RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {Topology} from "../Topology";
import {TypeUtil} from "../../Utility/TypeUtil";
import {IHeaders} from "../IHeaders";
import {ApiKeyAuthenticator} from "../../Database/Auth/ApiKeyAuthenticator";
import {IRavenObject} from "../../Database/IRavenObject";
import {Lock} from "../../Lock/Lock";
import {ILockDoneCallback} from "../../Lock/LockCallbacks";
import {GetTopologyCommand} from "../../Database/Commands/GetTopologyCommand";
import {RavenException, InvalidOperationException, BadRequestException, AuthorizationException} from "../../Database/DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {DateUtil} from "../../Utility/DateUtil";
import {IResponse, IErrorResponse} from "../Response/IResponse";
import {StatusCodes, StatusCode} from "../Response/StatusCode";

export class RequestExecutor {
  protected conventions?: DocumentConventions;
  protected headers: IHeaders;
  private _lock: Lock;
  private _authenticator: ApiKeyAuthenticator;
  private _topology: Topology;
  private _apiKey?: string = null;
  private _unauthorizedHandlerInitialized: boolean = false;
  private _initUrl: string;
  private _initDatabase: string;

  constructor(url: string, database: string, apiKey?: string, conventions?: DocumentConventions) {
    const serverNode: ServerNode = new ServerNode(url, database, apiKey);

    this._apiKey = apiKey;
    this._initUrl = url;
    this._initDatabase = database;
    this.conventions = conventions;
    this._lock = Lock.getInstance();
    this._authenticator = new ApiKeyAuthenticator();
    this._topology = new Topology(Number.MIN_SAFE_INTEGER, [serverNode]);
    this.headers = {
      "Accept": "application/json",
      "Has-Api-key": TypeUtil.isNone(apiKey) ? 'false' : 'true',
      "Raven-Client-Version": "4.0.0.0"
    };

    setTimeout(() => this.updateFailingNodesStatuses(), 60 * 1000);
    conventions.topologyUpdatesEnabled && setTimeout(() => this.getReplicationTopology(), 1 * 1000);
  }

  public execute(command: RavenCommand): BluebirdPromise<IRavenResponse | IRavenResponse[] | void> {
    if (!command.ravenCommand) {
      return BluebirdPromise.reject(new InvalidOperationException('Not a valid command'));
    }

    return this.chooseNodeForRequest(command)
      .then((node: ServerNode) => {      
        let chosenNode: ServerNode = node;

        const execute: () => BluebirdPromise<IRavenResponse | IRavenResponse[] | void> = () => {
          let requestOptions: RavenCommandRequestOptions;
          const startTime: number = DateUtil.timestampMs();
          const failNode: () => BluebirdPromise<IRavenResponse | IRavenResponse[] | void> = () => {
            chosenNode.isFailed = true;
            command.addFailedNode(chosenNode);

            return this.chooseNodeForRequest(command)
              .then((node: ServerNode) => {
                chosenNode = node;
                return execute();
              });
          };

          try {
            requestOptions = this.prepareCommand(command, chosenNode);
          } catch (exception) {
            return BluebirdPromise.reject(exception);
          }

          return RequestPromise(requestOptions)
            .finally(() => {
              chosenNode.addResponseTime(DateUtil.timestampMs() - startTime);
            })
            .catch((errorResponse: IErrorResponse) => {
              if (errorResponse.response) {
                return BluebirdPromise.resolve(errorResponse.response);
              }

              return failNode();
            })
            .then((response: IResponse): BluebirdPromise<IRavenResponse | IRavenResponse[] | void> | (IRavenResponse | IRavenResponse[] | void) => {
              let commandResponse: IRavenResponse | IRavenResponse[] | void = null;
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
                  return BluebirdPromise.reject(new AuthorizationException(
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
                    return BluebirdPromise.reject(StringUtil.format(
                      'Got unauthorized response for {url}. Please specify an api-key.',
                      chosenNode
                    ));
                  }

                  command.increaseAuthenticationRetries();

                  if (command.authenticationRetries > 1) {
                    return BluebirdPromise.reject(StringUtil.format(
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
                return BluebirdPromise.reject(exception);
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

  protected chooseNodeForRequest(command: RavenCommand): BluebirdPromise<ServerNode> {
    const topology: Topology = this._topology;
    let nonFailedNode: ServerNode;

    if (!(nonFailedNode = topology.nodes.find((node: ServerNode): boolean => 
        !node.isFailed && !command.isFailedWithNode(node)))
    ) {
      return BluebirdPromise.reject(new BadRequestException(
        'Tried all nodes in the cluster but failed getting a response'
      )) as BluebirdPromise<ServerNode>;
    }

    return BluebirdPromise.resolve(nonFailedNode) as BluebirdPromise<ServerNode>;
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
      parseInt(response.Etag as string) || 0,
      response.Nodes.map((jsonNode) => this.jsonToServerNode(jsonNode)),
      ('SLA' in response) ? parseFloat(response.SLA.RequestTimeThresholdInMilliseconds) / 1000 : 0
    );
  }

  protected jsonToServerNode(json: IRavenObject): ServerNode {
    return new ServerNode(json.Url, json.Database || this._initDatabase, json.ApiKey || null);
  }

  protected updateFailingNodesStatuses(): void {
    this._lock.acquireNodesStatuses(this._initUrl, this._initDatabase,
    (done: ILockDoneCallback) => {
      const topology = this._topology;

      (topology.nodes || [])
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

  protected handleUnauthorized(serverNode: ServerNode, shouldThrow: boolean = true): BluebirdPromise<void> {
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
        return BluebirdPromise.reject(error) as BluebirdPromise<void>;
      }

      return BluebirdPromise.resolve()  as BluebirdPromise<void>;
    });
  }

  protected updateCurrentToken(): void {
    const topology: Topology = this._topology;
    const nodes: ServerNode[] = topology.nodes;
    const setTimer: () => void = () => {
      setTimeout(() => this.updateCurrentToken(), 60 * 20 * 1000);
    };

    if (!this._unauthorizedHandlerInitialized) {
      return setTimer();
    }

    BluebirdPromise.all(nodes
      .map((node: ServerNode): BluebirdPromise<void> => this
      .handleUnauthorized(node, false)))
      .then(() => setTimer());
  }
}