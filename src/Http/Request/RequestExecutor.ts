import * as _ from 'lodash';
import * as BluebirdPromise from 'bluebird';
import * as RequestPromise from 'request-promise';
import {ServerNode} from '../ServerNode';
import {RavenCommand, RavenCommandRequestOptions} from '../../Database/RavenCommand';
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {Topology} from "../Topology";
import {IHeaders} from "../IHeaders";
import {Lock} from "../../Lock/Lock";
import {GetTopologyCommand} from "../../Database/Commands/GetTopologyCommand";
import {GetStatisticsCommand} from "../../Database/Commands/GetStatisticsCommand";
import {DateUtil} from "../../Utility/DateUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import {IResponse, IErrorResponse, IResponseBody} from "../Response/IResponse";
import {StatusCodes, StatusCode} from "../Response/StatusCode";
import {Observable} from "../../Utility/Observable";
import {NodeSelector} from "./NodeSelector";
import {NodeStatus} from "../NodeStatus";
import {IDisposable} from '../../Typedef/Contracts';
import {RavenException, InvalidOperationException, TopologyNodeDownException, AllTopologyNodesDownException, DatabaseLoadFailureException, UnsuccessfulRequestException} from "../../Database/DatabaseExceptions";
import {IRequestAuthOptions} from '../../Auth/AuthOptions';
import {IOptionsSet} from '../../Typedef/IOptionsSet';
import {Certificate, ICertificate} from '../../Auth/Certificate';

export interface ITopologyUpdateEvent {
  topologyJson: object;
  serverNodeUrl: string;
  requestedDatabase?: string;
  forceUpdate?: boolean;
  wasUpdated?: boolean;
}

export interface IRequestExecutorOptions {
  withoutTopology?: boolean;
  topologyEtag?: number;
  singleNodeTopology?: Topology;
  firstTopologyUpdateUrls?: string[];
  authOptions?: IRequestAuthOptions
}

export interface IRequestExecutor extends IDisposable {
  execute(command: RavenCommand): BluebirdPromise<IRavenResponse | IRavenResponse[] | void>;
}

export class RequestExecutor extends Observable implements IRequestExecutor {
  public static readonly REQUEST_FAILED      = 'request:failed';
  public static readonly TOPOLOGY_UPDATED    = 'topology:updated';
  public static readonly NODE_STATUS_UPDATED = 'node:status:updated';

  protected headers: IHeaders;
  protected readonly _maxFirstTopologyUpdatesTries: number = 5;
  protected _firstTopologyUpdatesTries: number = 0;
  protected _awaitFirstTopologyLock: Lock;
  protected _updateTopologyLock: Lock;
  protected _updateFailedNodeTimerLock: Lock;
  protected _firstTopologyUpdate: BluebirdPromise<void> = null;
  protected _withoutTopology: boolean;
  protected _nodeSelector: NodeSelector;
  protected _lastKnownUrls: string[];
  protected _initialDatabase: string;
  protected _topologyEtag: number;
  protected _faildedNodesStatuses: Map<ServerNode, NodeStatus>;
  protected _disposed: boolean = false;
  protected _authOptions: IRequestAuthOptions;
  protected _certificate: ICertificate = null;

  public get initialDatabase(): string {
    return this._initialDatabase;
  }

  constructor(database: string, options: IRequestExecutorOptions = {}) {
    super();

    const urls = options.firstTopologyUpdateUrls || [];

    this.headers = {
      "Accept": "application/json",
      "Raven-Client-Version": "4.0.0-beta",
    };

    this._disposed = false;
    this._lastKnownUrls = null;
    this._initialDatabase = database;
    this._withoutTopology = options.withoutTopology || false;
    this._topologyEtag = options.topologyEtag || 0;
    this._awaitFirstTopologyLock = Lock.make();
    this._updateTopologyLock = Lock.make();
    this._updateFailedNodeTimerLock = Lock.make();
    this._faildedNodesStatuses = new Map<ServerNode, NodeStatus>();
    this._authOptions = (<IRequestAuthOptions>options.authOptions) || null;

    if (!this._withoutTopology && urls.length) {
      this.startFirstTopologyUpdate(urls);
    } else if (this._withoutTopology && options.singleNodeTopology) {
      this._nodeSelector = new NodeSelector(this, options.singleNodeTopology);
    }
  }

  public dispose(): void {
    this._disposed = true;
    this.cancelFailingNodesTimers();
  }

  public static create(urls: string[], database?: string | IRequestAuthOptions, authOptions?: IRequestAuthOptions): IRequestExecutor {
    const self = <typeof RequestExecutor>this;
    let options: IRequestExecutorOptions = {
      withoutTopology: false,
      firstTopologyUpdateUrls: _.clone(urls)
    };

    if (authOptions) {
      options.authOptions = authOptions;
    }    

    return new self(<string>database, options);
  }

  public static createForSingleNode(url: string, database?: string | IRequestAuthOptions, authOptions?: IRequestAuthOptions): IRequestExecutor {
    const self = <typeof RequestExecutor>this;
    const topology = new Topology(-1, [new ServerNode(url, <string>database)]);
    let options: IRequestExecutorOptions = {
      withoutTopology: true,
      singleNodeTopology: topology,
      topologyEtag: -2
    };

    if (authOptions) {
      options.authOptions = authOptions;
    }

    return new self(<string>database, options);
  }

  public execute(command: RavenCommand): BluebirdPromise<IRavenResponse | IRavenResponse[] | void> {
    let chosenNode: ServerNode;
    let chosenNodeIndex: number;

    return this.awaitFirstTopologyUpdate()
      .then(() => { 
        const selector: NodeSelector = this._nodeSelector;

        chosenNode = selector.currentNode;
        chosenNodeIndex = selector.currentNodeIndex;

        return this.executeCommand(command, chosenNode)
      })
      .catch((exception: RavenException) => {
        if (exception instanceof TopologyNodeDownException) {
          return this.handleServerDown(command, chosenNode, chosenNodeIndex);
        }

        return BluebirdPromise.reject(exception);
      }) as BluebirdPromise<IRavenResponse | IRavenResponse[] | void>;
  }

  protected awaitFirstTopologyUpdate(): BluebirdPromise<void> {
    const firstTopologyUpdate: BluebirdPromise<void> = this._firstTopologyUpdate;

    if (this._withoutTopology) {
      return BluebirdPromise.resolve();
    }

    return this._awaitFirstTopologyLock.acquire((): boolean => {
      let isFulfilled: boolean = false;

      if (firstTopologyUpdate === this._firstTopologyUpdate) {
        isFulfilled = null === firstTopologyUpdate;

        if (!isFulfilled) {
          isFulfilled = firstTopologyUpdate.isFulfilled();

          if (firstTopologyUpdate.isRejected()) {
            this.startFirstTopologyUpdate(this._lastKnownUrls);
          }
        }        
      }

      return isFulfilled;
    })
    .then((isFulfilled: boolean): BluebirdPromise.Thenable<void> => (isFulfilled 
      ? BluebirdPromise.resolve() : (this.isFirstTopologyUpdateTriesExpired() 
      ? BluebirdPromise.reject(new DatabaseLoadFailureException('Max topology update tries reached')) 
      : BluebirdPromise.delay(100).then((): BluebirdPromise.Thenable<void> => this.awaitFirstTopologyUpdate())))
    );
  }

  protected prepareCommand(command: RavenCommand, node: ServerNode): RavenCommandRequestOptions {
    let options: RavenCommandRequestOptions;

    command.createRequest(node);
    options = command.toRequestOptions(); 
    Object.assign(options.headers, this.headers);

    if (!this._withoutTopology) {
      options.headers["Topology-Etag"] = this._topologyEtag;
    }

    if (this._authOptions && node.isSecure) {
      let agentOptions: IOptionsSet = {};

      if (!this._certificate) {
        this._certificate = Certificate.createFromOptions(this._authOptions);
      }

      this._certificate.toAgentOptions(agentOptions);
      options.agentOptions = agentOptions;
    }

    return options;
  }

  protected executeCommand(command: RavenCommand, node: ServerNode): BluebirdPromise<IRavenResponse | IRavenResponse[] | void> {
    let requestOptions: RavenCommandRequestOptions;
    const startTime: number = DateUtil.timestampMs();

    if (this._disposed) {
      return BluebirdPromise.resolve();
    }

    if (!(command instanceof RavenCommand)) {
      return BluebirdPromise.reject(new InvalidOperationException('Not a valid command'));
    }

    try {
      requestOptions = this.prepareCommand(command, node);
    } catch (exception) {
      return BluebirdPromise.reject(exception);
    }

    return RequestPromise(requestOptions)
      .finally(() => {
        node.responseTime = DateUtil.timestampMs() - startTime;
      })
      .catch((errorResponse: IErrorResponse) => {
          if (errorResponse.response) {
            return BluebirdPromise.resolve(errorResponse.response);
        }

        return BluebirdPromise.reject(new TopologyNodeDownException(`Node ${node.url} is down`));
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
        if (StatusCodes.isNotFound(code)) {
          delete response.body;
        }
        
        if (isServerError) {
          if (command.wasFailed) {
            let message: string = 'Unsuccessfull request';

            if (response.body && (<IResponseBody>response.body).Error) {
                message += `: ${(<IResponseBody>response.body).Error}`;
            }

            return BluebirdPromise.reject(new UnsuccessfulRequestException(message));
          }

          return BluebirdPromise.reject(new TopologyNodeDownException(`Node ${node.url} is down`));
        }
      
        if (!this._withoutTopology && ("Refresh-Topology" in response.headers)) {
          this.updateTopology(node);
        }

        try {
          commandResponse = command.setResponse(response);
        } catch (exception) {
          return BluebirdPromise.reject(exception);
        }

        return commandResponse;
      });
  }

  protected handleServerDown(command: RavenCommand, failedNode: ServerNode, nodeIndex: number): BluebirdPromise<IRavenResponse | IRavenResponse[] | void> {
    let nextNode: ServerNode;
    const nodeSelector: NodeSelector = this._nodeSelector;
    const {REQUEST_FAILED} = <typeof RequestExecutor>this.constructor;

    command.addFailedNode(failedNode);

    return this._updateFailedNodeTimerLock.acquire(() => {
      const status: NodeStatus = new NodeStatus(nodeIndex, failedNode, 
        (status: NodeStatus) => this.checkNodeStatus(status)
      );
      
      this._faildedNodesStatuses.set(failedNode, status);
      status.startUpdate();
    })
    .then((): BluebirdPromise<IRavenResponse | IRavenResponse[] | void> => {
      this.emit<ServerNode>(REQUEST_FAILED, failedNode);
    
      if (!(nextNode = nodeSelector.currentNode) || command.wasFailedWithNode(nextNode)) {
        return BluebirdPromise.reject(new AllTopologyNodesDownException(
          'Tried all nodes in the cluster but failed getting a response'
        ));
      }

      return this.executeCommand(command, nextNode);
    });
  }

  protected startFirstTopologyUpdate(updateTopologyUrls: string[]): void {
    let url: string = null;
    let urls: string[] = _.clone(updateTopologyUrls.reverse());

    const update = (url: string): BluebirdPromise<void> => 
      this.updateTopology(new ServerNode(url, this._initialDatabase))
      .catch((error: Error): BluebirdPromise.Thenable<void> => tryNextUrl(error));

    const tryNextUrl = (error: Error): BluebirdPromise.Thenable<void> => {
      if (url = urls.pop()) {
        return update(url);
      }

      return BluebirdPromise.reject(error);
    }

    this._lastKnownUrls = updateTopologyUrls;

    if (!this.isFirstTopologyUpdateTriesExpired()) {
      this._firstTopologyUpdatesTries++;
      this._firstTopologyUpdate = update(urls.pop())
        .then(() => this._firstTopologyUpdate = null);
    }    
  }

  protected isFirstTopologyUpdateTriesExpired() {
    return this._firstTopologyUpdatesTries >= this._maxFirstTopologyUpdatesTries;
  }

  protected updateTopology(node: ServerNode): BluebirdPromise<void> {
    const {TOPOLOGY_UPDATED} = <typeof RequestExecutor>this.constructor;
    const topologyCommandClass: new() => RavenCommand = this.getUpdateTopologyCommandClass();

    return this._updateTopologyLock.acquire((): BluebirdPromise<void> =>
      this.executeCommand(new topologyCommandClass(), node)
        .then((response?: IRavenResponse) => {
          if (this._nodeSelector) {
              let eventData: ITopologyUpdateEvent = {
              topologyJson: response,
              serverNodeUrl: node.url,
              requestedDatabase: node.database,
              forceUpdate: false
            };

            this.emit<ITopologyUpdateEvent>(TOPOLOGY_UPDATED, eventData);

            if (eventData.wasUpdated) {
              this.cancelFailingNodesTimers();
            }
          } else {
            this._nodeSelector = new NodeSelector(this, Topology.fromJson(response));
          }

          this._topologyEtag = this._nodeSelector.topologyEtag;
      })          
    );   
  }

  protected getUpdateTopologyCommandClass(): new() => RavenCommand {
    return GetTopologyCommand;
  }

  protected checkNodeStatus(nodeStatus: NodeStatus): void {
    const nodes = this._nodeSelector.nodes;
    const index: number = nodeStatus.nodeIndex;
    const node: ServerNode = nodeStatus.node;

    if ((index < nodes.length) && (node === nodes[index])) {
      this.performHealthCheck(node);
    }
  }

  protected performHealthCheck(node: ServerNode): void {
    const {NODE_STATUS_UPDATED} = <typeof RequestExecutor>this.constructor;
    const command: GetStatisticsCommand = new GetStatisticsCommand(true);
    const startTime: number = DateUtil.timestampMs();
    let isStillFailed: boolean = true, status: NodeStatus;

    if (this._disposed) {
      return;
    }

    RequestPromise(this.prepareCommand(command, node))
      .catch((errorResponse: IErrorResponse) => {
        if (errorResponse.response) {
          return BluebirdPromise.resolve(errorResponse.response);
        }
      })
      .then((response?: IResponse) => {
        if (!TypeUtil.isNull(response) && StatusCodes.isOk(response.statusCode)) {
          isStillFailed = false;
          this.emit<ServerNode>(NODE_STATUS_UPDATED, node);

          if (status = this._faildedNodesStatuses.get(node)) {
            status.dispose();
            this._faildedNodesStatuses.delete(node);
          }
        }
      })      
      .finally(() => {
        node.responseTime = DateUtil.timestampMs() - startTime;

        if (isStillFailed && (status = this._faildedNodesStatuses.get(node))) {
          status.retryUpdate();
        }
      });
  }

  protected cancelFailingNodesTimers(): void {
    for (let status of this._faildedNodesStatuses.values()) {
      status.dispose();
    }

    this._faildedNodesStatuses.clear();
  }
}