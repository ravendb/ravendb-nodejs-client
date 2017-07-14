// NodeSTatus - keep timer ids, pass update callback from executor
// update node & topology
// add cluster executor - use it for operaitons
// cancel refresh times after topology update
// check concurrency mode determination

import * as _ from 'lodash';
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
import {GetStatisticsCommand} from "../../Database/Commands/GetStatisticsCommand";
import {StringUtil} from "../../Utility/StringUtil";
import {DateUtil} from "../../Utility/DateUtil";
import {IResponse, IErrorResponse} from "../Response/IResponse";
import {StatusCodes, StatusCode} from "../Response/StatusCode";
import {Observable} from "../../Utility/Observable";
import {NodeSelector} from "./NodeSelector";
import {NodeStatus} from "../NodeStatus";
import {RavenException, InvalidOperationException, BadRequestException, AuthorizationException, TopologyNodeDownException, AllTopologyNodesDownException, DatabaseLoadFailureException, UnsuccessfulRequestException} from "../../Database/DatabaseExceptions";

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
}

export class RequestExecutor extends Observable {
  public static readonly REQUEST_FAILED      = 'request:failed';
  public static readonly TOPOLOGY_UPDATED    = 'topology:updated';
  public static readonly NODE_STATUS_UPDATED = 'node:status:updated';

  protected headers: IHeaders;
  private readonly _maxFirstTopologyUpdatesTries: number = 5;
  private _fistTopologyUpdatesTries: number = 0;
  private _awaitFirstTopologyLock: Lock;
  private _updateTopologyLock: Lock;
  private _updateFailedNodeTimerLock: Lock;
  private _firstTopologyUpdate: BluebirdPromise<void> = null;
  private _withoutTopology: boolean;
  private _nodeSelector: NodeSelector;
  private _lastKnownUrls: string[];
  private _initialDatabase: string;
  private _topologyEtag: number;
  private _faildedNodesStatuses: Map<ServerNode, NodeStatus>;

  public get initialDatabase(): string {
    return this._initialDatabase;
  }

  constructor(database: string, options: IRequestExecutorOptions = {}) {
    super();

    const urls = options.firstTopologyUpdateUrls || [];

    this.headers = {
      "Accept": "application/json",
      "Has-Api-key": 'false',
      "Raven-Client-Version": "4.0.1.2",
    };

    this._lastKnownUrls = null;
    this._initialDatabase = database;
    this._withoutTopology = options.withoutTopology || false;
    this._topologyEtag = options.topologyEtag || 0;
    this._awaitFirstTopologyLock = Lock.make();
    this._updateTopologyLock = Lock.make();
    this._updateFailedNodeTimerLock = Lock.make();
    this._faildedNodesStatuses = new Map<ServerNode, NodeStatus>();

    if (!this._withoutTopology && urls.length) {
      this.startFirstTopologyUpdate(urls);
    } else if (this._withoutTopology && options.singleNodeTopology) {
      this._nodeSelector = new NodeSelector(this, options.singleNodeTopology);
    }
  }

  public static create(urls: string[], database: string): RequestExecutor {
    const self = <typeof RequestExecutor>this;

    return new self(database, {
      withoutTopology: false,
      firstTopologyUpdateUrls: urls
    });
  }

  public static createForSingleNode(url: string, database: string): RequestExecutor {
    const self = <typeof RequestExecutor>this;
    const topology = new Topology(-1, [new ServerNode(url, database)]);

    return new self(database, {
      withoutTopology: true,
      singleNodeTopology: topology,
      topologyEtag: -2
    });
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
      });
  }

  protected awaitFirstTopologyUpdate(): BluebirdPromise<void> {
    const firstTopologyUpdate: BluebirdPromise<void> = this._firstTopologyUpdate;

    if (this._withoutTopology) {
      return BluebirdPromise.resolve();
    }

    return this._awaitFirstTopologyLock.acquire((): boolean => {
      let isFulfilled: boolean = false;

      if (firstTopologyUpdate === this._firstTopologyUpdate) {
        isFulfilled = firstTopologyUpdate.isFulfilled();

        if (firstTopologyUpdate.isRejected()) {
          this.startFirstTopologyUpdate(this._lastKnownUrls);
        }
      }
      
      return isFulfilled;
    })
    .then((isFulfilled: boolean): BluebirdPromise.Thenable<void> => isFulfilled 
      ? BluebirdPromise.resolve() : (this.isFirstTopologyUpdateTriesExpired() 
      ? BluebirdPromise.reject(new DatabaseLoadFailureException('Max topology update tries reched')) 
      : this.awaitFirstTopologyUpdate())
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

    return options;
  }

  protected executeCommand(command: RavenCommand, node: ServerNode): BluebirdPromise<IRavenResponse | IRavenResponse[] | void> {
    let requestOptions: RavenCommandRequestOptions;
    const startTime: number = DateUtil.timestampMs();

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

            if (response.body && response.body.Error) {
              message += `: ${response.body.Error}`;
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
    const urls: string[] = updateTopologyUrls.reverse();

    const update = (url: string): BluebirdPromise<void> => 
      this.updateTopology(new ServerNode(url, this._initialDatabase))
      .catch((error: Error): BluebirdPromise.Thenable<void> => tryNextUrl(error));

    const tryNextUrl = (error: Error): BluebirdPromise.Thenable<void> => {
      if (url = urls.pop()) {
        return update(url);
      }

      return BluebirdPromise.reject<void>(error);
    }

    this._lastKnownUrls = updateTopologyUrls;

    if (!this.isFirstTopologyUpdateTriesExpired()) {
      this._fistTopologyUpdatesTries++;
      this._firstTopologyUpdate = update(urls.pop());
    }    
  }

  protected isFirstTopologyUpdateTriesExpired() {
    return this._fistTopologyUpdatesTries >= this._maxFirstTopologyUpdatesTries;
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

    RequestPromise(this.prepareCommand(command, node))
      .then((response: IResponse) => {
        if (StatusCodes.isOk(response.statusCode)) {
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