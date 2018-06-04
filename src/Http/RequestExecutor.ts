import * as os from "os";
import * as BluebirdPromise from "bluebird";
import * as semaphore from "semaphore";
import { acquireSemaphore } from "../Utility/SemaphoreUtil";
import { getLogger, ILogger } from "../Utility/LogUtil";
import { Timer } from "../Primitives/Timer";
import { ServerNode } from "./ServerNode";
import { RavenCommand, ResponseDisposeHandling } from "./RavenCommand";
import { Topology } from "./Topology";
import { GetDatabaseTopologyCommand } from "../ServerWide/Commands/GetDatabaseTopologyCommand";
import { StatusCodes} from "./StatusCode";
import { NodeSelector } from "./NodeSelector";
import { IDisposable } from "../Types/Contracts";
import { IRequestAuthOptions, IAuthOptions } from "../Auth/AuthOptions";
import { Certificate, ICertificate } from "../Auth/Certificate";
import { ReadBalanceBehavior } from "./ReadBalanceBehavior";
import { HttpCache, CachedItemMetadata, ReleaseCacheItem } from "./HttpCache";
import { AggressiveCacheOptions } from "./AggressiveCacheOptions";
import { throwError, RavenErrorType, ExceptionDispatcher, ExceptionSchema } from "../Exceptions";
import { 
    GetClientConfigurationCommand, 
    GetClientConfigurationOperationResult
} from "../Documents/Operations/Configuration/GetClientConfigurationOperation";
import CurrentIndexAndNode from "./CurrentIndexAndNode";
import { HttpRequestBase, HttpResponse } from "../Primitives/Http";
import { HEADERS } from "../Constants";
import { Stopwatch } from "../Utility/Stopwatch";
import * as PromiseUtil from "../Utility/PromiseUtil";
import { GetStatisticsOperation } from "../Documents/Operations/GetStatisticsOperation";
import { DocumentConventions } from "../Documents/Conventions/DocumentConventions";
import { TypeUtil } from "../Utility/TypeUtil";
import { RequestPromiseOptions } from "request-promise";
import { SessionInfo } from "../Documents/Session/IDocumentSession";
import { JsonSerializer } from "../Mapping/Json/Serializer";
import { validateUri } from "../Utility/UriUtil";

const DEFAULT_REQUEST_OPTIONS = {
    simple: false,
    resolveWithFullResponse: true
};

export function getDefaultRequestOptions(): RequestPromiseOptions {
    return DEFAULT_REQUEST_OPTIONS;
}

const log = getLogger({ module: "RequestExecutor" });

export interface ExecuteOptions<TResult> {
    chosenNode: ServerNode;
    nodeIndex: number;
    shouldRetry: boolean;
}

export interface ITopologyUpdateEvent {
    topologyJson: object;
    serverNodeUrl: string;
    requestedDatabase?: string;
    forceUpdate?: boolean;
    wasUpdated?: boolean;
}

export interface IRequestExecutorOptions {
    authOptions?: IRequestAuthOptions;
    documentConventions?: DocumentConventions;
}

class IndexAndResponse {
    public readonly index: number;
    public readonly response: HttpResponse;

    public constructor(index: number, response: HttpResponse) {
        this.index = index;
        this.response = response;
    }
}

export class NodeStatus implements IDisposable {

        private _nodeStatusCallback: (nodeStatus: NodeStatus) => Promise<void>;
        private _timerPeriodInMs: number;
        public readonly nodeIndex: number;
        public readonly node: ServerNode;
        private _timer: Timer;

        public constructor(
            nodeIndex: number, 
            node: ServerNode, 
            nodeStatusCallback: (nodeStatus: NodeStatus) => Promise<void>) {
            this.nodeIndex = nodeIndex;
            this.node = node;
            this._timerPeriodInMs = 100;
            this._nodeStatusCallback = nodeStatusCallback;
        }

        private _nextTimerPeriod(): number {
            if (this._timerPeriodInMs <= 5000) {
                return 5000;
            }

            this._timerPeriodInMs = this._timerPeriodInMs + 100;

            return this._timerPeriodInMs;
        }

        public startTimer(): void {
            const that = this;
            this._timer = new Timer(function timerActionNodeStatusCallback() { 
                return that._nodeStatusCallback(that);
            }, this._timerPeriodInMs);
        }

        public updateTimer(): void {
            this._timer.change(this._nextTimerPeriod());
        }

        public dispose(): void {
            this._timer.dispose();
        }
    }

export class RequestExecutor implements IDisposable {

    private _log: ILogger;

    public static readonly CLIENT_VERSION = "4.0.0";

    private _updateDatabaseTopologySemaphore = semaphore();
    private _updateClientConfigurationSemaphore = semaphore();

    private static _failureCheckOperation = new GetStatisticsOperation("failure=check");

    private _failedNodesTimers: Map<ServerNode, NodeStatus> = new Map();
    protected _databaseName: string;
    protected _certificate: ICertificate = null;

    private _lastReturnedResponse: Date;
    protected _readBalanceBehavior: ReadBalanceBehavior;

    private _cache: HttpCache;

    private _topologyTakenFromNode: ServerNode;

    public agressiveCaching: AggressiveCacheOptions = null;

    private _updateTopologyTimer: Timer;

    protected _nodeSelector: NodeSelector;

    public numberOfServerRequests: number = 0;

    protected _disposed: boolean;

    protected _firstTopologyUpdatePromise: BluebirdPromise<void>;

    protected _lastKnownUrls: string[];

    protected _clientConfigurationEtag: number = 0;

    protected _topologyEtag: number = 0;

    private _conventions: DocumentConventions;

    private _authOptions: IAuthOptions;

    protected _disableTopologyUpdates: boolean;

    protected _disableClientConfigurationUpdates: boolean;

    public static requestPostProcessor: (req: HttpRequestBase) => void = null;

    public getTopologyEtag() {
        return this._topologyEtag;
    }

    public get conventions() {
        return this._conventions;
    }

    public getClientConfigurationEtag() {
        return this._clientConfigurationEtag;
    }

    public get cache() {
        return this._cache;
    }

    public get disposed() {
        return this._disposed;
    }

    public getUrl (): string {
        if (!this._nodeSelector) {
            return null;
        }

        const preferredNode = this._nodeSelector.getPreferredNode();

        return preferredNode
            ? preferredNode.currentNode.url
            : null;
    }

    public getTopology (): Topology {
        return this._nodeSelector
            ? this._nodeSelector.getTopology()
            : null;
    }

    public getTopologyNodes (): ServerNode[] {
        const topology = this.getTopology();
        return topology
            ? [...topology.nodes]
            : null;
    }

    protected constructor (
        database: string,
        authOptions: IRequestAuthOptions,
        conventions: DocumentConventions) {

        this._log = getLogger({ 
            module: `${this.constructor.name}-${ Math.floor(Math.random() * 10000) }` 
        });

        this._cache = new HttpCache(conventions.maxHttpCacheSize);
        this._readBalanceBehavior = conventions.readBalanceBehavior;
        this._databaseName = database;
        this._lastReturnedResponse = new Date();
        this._conventions = conventions.clone();
        this._authOptions = authOptions;
        this._certificate = Certificate.createFromOptions(this._authOptions);
    }

    public static create (
        intialUrls: string[],
        database: string): RequestExecutor; 
    public static create (
        intialUrls: string[],
        database: string,
        opts?: IRequestExecutorOptions): RequestExecutor;
    public static create (
        intialUrls: string[],
        database: string,
        opts?: IRequestExecutorOptions): RequestExecutor {
        const { authOptions, documentConventions } = opts || {} as IRequestExecutorOptions;
        const executor = new RequestExecutor(database, authOptions, documentConventions);
        executor._firstTopologyUpdatePromise = executor._firstTopologyUpdate(intialUrls);
        return executor;
    }

    public static createForSingleNodeWithConfigurationUpdates (
        url: string, database: string, opts: IRequestExecutorOptions): RequestExecutor {
        const executor =
            this.createForSingleNodeWithoutConfigurationUpdates(
                url, database, opts);
        executor._disableClientConfigurationUpdates = false;
        return executor;
    }

    public static createForSingleNodeWithoutConfigurationUpdates (
        url: string, database: string, opts: IRequestExecutorOptions) {
        
        const { authOptions, documentConventions } = opts;
        const initialUrls: string[] = RequestExecutor._validateUrls([url], authOptions);

        const executor = new RequestExecutor(database, authOptions, documentConventions);
        const topology: Topology = new Topology();
        topology.etag = -1;

        const serverNode = new ServerNode({
            url: initialUrls[0],
            database
        });

        topology.nodes = [serverNode];

        executor._nodeSelector = new NodeSelector(topology);
        executor._topologyEtag = -2;
        executor._disableTopologyUpdates = true;
        executor._disableClientConfigurationUpdates = true;

        return executor;
    }

    private _ensureNodeSelector(): Promise<void> {
        let promise: Promise<void> = Promise.resolve();
        if (this._firstTopologyUpdatePromise
            && !this._firstTopologyUpdatePromise.isFulfilled()) {
            promise = Promise.resolve(this._firstTopologyUpdatePromise); 
        }

        return promise.then(() => {
            if (!this._nodeSelector) {
                const topology = new Topology(this._topologyEtag, this.getTopologyNodes());
                this._nodeSelector = new NodeSelector(topology);
            }
        });
    }

    public getPreferredNode(): Promise<CurrentIndexAndNode> {
        return this._ensureNodeSelector()
            .then(() => this._nodeSelector.getPreferredNode());
    }

    public getNodeBySessionId(sessionId: number): Promise<CurrentIndexAndNode> {
        return this._ensureNodeSelector()
            .then(() => this._nodeSelector.getNodeBySessionId(sessionId));
    }

    public getFastestNode(): Promise<CurrentIndexAndNode> {
        return this._ensureNodeSelector()
            .then(() => this._nodeSelector.getFastestNode());
    }

    protected _updateClientConfiguration (): PromiseLike<void> {
        if (this._disposed) {
            return BluebirdPromise.resolve(null);
        }

        const updateClientConfigurationInternal = () => {
            const oldDisableClientConfigurationUpdates = this._disableClientConfigurationUpdates;
            this._disableClientConfigurationUpdates = true;

            return BluebirdPromise.resolve()
                .then(() => {

                    if (this._disposed) {
                        return;
                    }

                    const command = new GetClientConfigurationCommand();
                    const currentIndexAndNode2: CurrentIndexAndNode = this.chooseNodeForRequest(command, null);
                    return this.execute(command, null, {
                        chosenNode: currentIndexAndNode2.currentNode,
                        nodeIndex: currentIndexAndNode2.currentIndex,
                        shouldRetry: false
                    })
                    .then(() => command.result);
                })
                .then((clientConfigOpResult: GetClientConfigurationOperationResult) => {
                    if (!clientConfigOpResult) {
                        return;
                    }

                    this._conventions.updateFrom(clientConfigOpResult.configuration);
                    this._clientConfigurationEtag = clientConfigOpResult.etag;

                })
                .tapCatch(err => this._log.error(err, "Error getting client configuration."))
                .finally(() => {
                    this._disableClientConfigurationUpdates = oldDisableClientConfigurationUpdates;
                });
        };

        const semAcquiredContext = acquireSemaphore(this._updateClientConfigurationSemaphore);
        const result = BluebirdPromise.resolve(semAcquiredContext.promise)
            .then(() => updateClientConfigurationInternal())
            .finally(() => {
                semAcquiredContext.dispose();
            });

        return Promise.resolve(result);
    }

    public updateTopology(node: ServerNode, timeout: number, forceUpdate: boolean = false): Promise<boolean> {
        if (this._disposed) {
            return Promise.resolve(false);
        }

        const acquiredSemContext = acquireSemaphore(this._updateDatabaseTopologySemaphore, { timeout });
        const result = BluebirdPromise.resolve(acquiredSemContext.promise)
            .then(() => {
                if (this._disposed) {
                    return false;
                }

                this._log.info(`Update topology from ${node.url}.`);

                const getTopology = new GetDatabaseTopologyCommand();
                const getTopologyPromise = this.execute(getTopology, null, {
                    chosenNode: node,
                    nodeIndex: null,
                    shouldRetry: false,
                });
                return getTopologyPromise
                    .then(() => {
                        const topology = getTopology.result;
                        if (!this._nodeSelector) {
                            this._nodeSelector = new NodeSelector(topology);

                            if (this._readBalanceBehavior === "FastestNode") {
                                this._nodeSelector.scheduleSpeedTest();
                            }

                        } else if (this._nodeSelector.onUpdateTopology(topology, forceUpdate)) {
                            this._disposeAllFailedNodesTimers();

                            if (this._readBalanceBehavior === "FastestNode") {
                                this._nodeSelector.scheduleSpeedTest();
                            }
                        }

                        this._topologyEtag = this._nodeSelector.getTopology().etag;

                        return true;
                    });
            },
            (reason: Error) => {
                if (reason.name === "TimeoutError") {
                    return false;
                }

                throw reason;
            })
            .finally(() => {
                acquiredSemContext.dispose();
            });

        return Promise.resolve(result);
    }

    protected static _validateUrls(initialUrls: string[], authOptions: IAuthOptions) {
        const cleanUrls = [...Array(initialUrls.length)];
        let requireHttps = !!authOptions;
        for (let index = 0; index < initialUrls.length; index++) {
            const url = initialUrls[index];
            validateUri(url);
            cleanUrls[index] = url.replace(/\/$/, "");
            requireHttps = requireHttps || url.startsWith("https://");
        }

        if (!requireHttps) {
            return cleanUrls;
        }

        for (const url of initialUrls) {
            if (!url.startsWith("http://")) {
                continue;
            }

            if (authOptions && authOptions.certificate) {
                throwError("InvalidOperationException", 
                    "The url " + url + " is using HTTP, but a certificate is specified, which require us to use HTTPS");
            }

            throwError("InvalidOperationException",
                "The url " + url
                + " is using HTTP, but other urls are using HTTPS, and mixing of HTTP and HTTPS is not allowed.");
        }

        return cleanUrls;
    }

    private _initializeUpdateTopologyTimer (): void {
        if (this._updateTopologyTimer || this._disposed) {
            return;
        }

        this._log.info("Initialize update topology timer.");

        const minInMs = 60 * 1000;
        const that = this;
        this._updateTopologyTimer = 
            new Timer(function timerActionUpdateTopology () { 
                return that._updateTopologyCallback();
            }, minInMs, minInMs);
    }

    private _updateTopologyCallback (): Promise<void> {
        const time = new Date();
        const minInMs = 60 * 1000;
        if (time.valueOf() - this._lastReturnedResponse.valueOf() <= minInMs) {
            return;
        }

        let serverNode: ServerNode;

        try {
            const preferredNode: CurrentIndexAndNode = this._nodeSelector.getPreferredNode();
            serverNode = preferredNode.currentNode;
        } catch (err) {
            this._log.warn(err, "Couldn't get preferred node Topology from _updateTopologyTimer");
            return;
        }

        return this.updateTopology(serverNode, 0)
            .catch(err => {
                this._log.error(err, "Couldn't update topology from _updateTopologyTimer");
                return null;
            });
    }

protected _firstTopologyUpdate (inputUrls: string[]): BluebirdPromise<void> {
        const initialUrls: string[] = RequestExecutor._validateUrls(inputUrls, this._authOptions);

        const topologyUpdateErrors: Array<{ url: string, error: Error | string }> = [];

        const tryUpdateTopology = (url: string, database: string): PromiseLike<boolean> => {
            const serverNode = new ServerNode({ url, database });
            return BluebirdPromise.resolve()
                .then(() => this.updateTopology(serverNode, TypeUtil.MAX_INT32))
                .then(() => {
                    this._initializeUpdateTopologyTimer();
                    this._topologyTakenFromNode = serverNode;
                    return true;
                })
                .catch(error => {
                    if (error.name === "DatabaseDoesNotExistException") {
                        this._lastKnownUrls = initialUrls;
                    }

                    if (initialUrls.length === 0) {
                        this._lastKnownUrls = initialUrls;
                        throwError("InvalidOperationException", 
                            `Cannot get topology from server: ${url}.`, error);
                    }

                    topologyUpdateErrors.push({ url, error });
                    return false;
                });
        };

        const tryUpdateTopologyOnAllNodes = () => {
            return initialUrls.reduce((reduceResult, nextUrl) => {
                return reduceResult
                    .then(breakLoop => {
                        if (!breakLoop) {
                            return tryUpdateTopology(nextUrl, this._databaseName);
                        }

                        return true;
                    });
            }, BluebirdPromise.resolve(false) as PromiseLike<boolean>);
        };

        const result = BluebirdPromise.resolve()
            .then(() => tryUpdateTopologyOnAllNodes())
            .then(() => {
                const topology = new Topology();
                topology.etag = this._topologyEtag;

                let topologyNodes = this.getTopologyNodes();
                if (!topologyNodes) {
                    topologyNodes = initialUrls.map(url => {
                        const serverNode = new ServerNode({ 
                            url, database: this._databaseName });
                        serverNode.clusterTag = "!";
                        return serverNode;
                    });
                }

                topology.nodes = topologyNodes;

                this._nodeSelector = new NodeSelector(topology);

                if (initialUrls && initialUrls.length > 0) {
                    this._initializeUpdateTopologyTimer();
                    return;
                }

                this._lastKnownUrls = initialUrls;
                const details: string = topologyUpdateErrors
                    .map(x => `${x.url} -> ${x.error && (x.error as Error).stack ? (x.error as Error).stack : x.error}`)
                    .join(", ");

                this._throwExceptions(details);
            });

        return result;
    }
    
    protected _throwExceptions (details: string): void {
        throwError("InvalidOperationException",
            "Failed to retrieve database topology from all known nodes" 
                + os.EOL + details);
    }

    protected _disposeAllFailedNodesTimers (): void {
        for (const item of this._failedNodesTimers) {
            item[1].dispose();
        }

        this._failedNodesTimers.clear();
    }

    public chooseNodeForRequest<TResult> (cmd: RavenCommand<TResult>, sessionInfo: SessionInfo): CurrentIndexAndNode {
        if (!cmd.isReadRequest) {
            return this._nodeSelector.getPreferredNode();
        }

        switch (this._readBalanceBehavior) {
            case "None":
                return this._nodeSelector.getPreferredNode();
            case "RoundRobin":
                return this._nodeSelector.getNodeBySessionId(sessionInfo ? sessionInfo.sessionId : 0);
            case "FastestNode":
                return this._nodeSelector.getFastestNode();
            default:
                throwError("NotSupportedException", `Invalid read balance behavior: ${this._readBalanceBehavior}`);
        }
    }

    public execute<TResult> (command: RavenCommand<TResult>): Promise<void>;
    public execute<TResult> (command: RavenCommand<TResult>, sessionInfo?: SessionInfo): Promise<void>;
    public execute<TResult> (
        command: RavenCommand<TResult>, sessionInfo?: SessionInfo, options?: ExecuteOptions<TResult>): Promise<void>;
    public execute<TResult> (
        command: RavenCommand<TResult>,
        sessionInfo?: SessionInfo,
        options?: ExecuteOptions<TResult>): Promise<void> {
        if (options) {
            return this._executeOnSpecificNode(command, sessionInfo, options);
        }

        this._log.info(`Execute command ${command.constructor.name}`);

        const topologyUpdate = this._firstTopologyUpdatePromise;
        if ((topologyUpdate && topologyUpdate.isFulfilled()) || this._disableTopologyUpdates) {
            const currentIndexAndNode: CurrentIndexAndNode = this.chooseNodeForRequest(command, sessionInfo);
            return this._executeOnSpecificNode(command, sessionInfo, {
                chosenNode: currentIndexAndNode.currentNode,
                nodeIndex: currentIndexAndNode.currentIndex,
                shouldRetry: true
            });
        } else {
            return this._unlikelyExecute(command, topologyUpdate, sessionInfo);
        }
    }

    private _unlikelyExecute<TResult> (
        command: RavenCommand<TResult>,
        topologyUpdate: BluebirdPromise<void>,
        sessionInfo: SessionInfo): Promise<void> {

        const result = BluebirdPromise.resolve()
            .then(() => {
                if (!this._firstTopologyUpdatePromise) {
                    if (!this._lastKnownUrls) {
                            throwError("InvalidOperationException",
                                "No known topology and no previously known one, cannot proceed, likely a bug");
                    }

                    topologyUpdate = this._firstTopologyUpdate(this._lastKnownUrls);
                }

                return topologyUpdate;
            })
            .catch(reason => {
                if (this._firstTopologyUpdatePromise === topologyUpdate) {
                    this._firstTopologyUpdatePromise = null; // next request will raise it
                }

                this._log.warn(reason, "Error doing topology update.");

                throw reason;
            })
            .then(() => {
                const currentIndexAndNode: CurrentIndexAndNode = this.chooseNodeForRequest(command, sessionInfo);
                return this._executeOnSpecificNode(command, sessionInfo, {
                    chosenNode: currentIndexAndNode.currentNode,
                    nodeIndex: currentIndexAndNode.currentIndex,
                    shouldRetry: true
                });
            });

        return Promise.resolve(result);
    }

    private _getFromCache<TResult> (
        command: RavenCommand<TResult>,
        url: string,
        cachedItemMetadataCallback: (data: CachedItemMetadata) => void) {

        if (command.canCache
            && command.isReadRequest
            && command.responseType === "Object") {
            return this._cache.get(url, cachedItemMetadataCallback);
        }

        cachedItemMetadataCallback({
            changeVector: null,
            response: null
        });

        return new ReleaseCacheItem(null);
    }

    private _executeOnSpecificNode<TResult> (
        command: RavenCommand<TResult>,
        sessionInfo: SessionInfo = null,
        options: ExecuteOptions<TResult> = null): Promise<void> {

        const { chosenNode, nodeIndex, shouldRetry } = options;

        this._log.info(`Actual execute ${command.constructor.name} on ${chosenNode.url}`
            + ` ${ shouldRetry ? "with" : "without" } retry.`);

        const req: HttpRequestBase = this._createRequest(chosenNode, command);

        let cachedChangeVector;
        let cachedValue;
        const cachedItem = this._getFromCache(command, req.uri.toString(), (cachedItemMetadata) => {
            cachedChangeVector = cachedItemMetadata.changeVector;
            cachedValue = cachedItemMetadata.response;
        });

        if (cachedChangeVector) {
            const aggressiveCacheOptions = this.agressiveCaching;
            if (aggressiveCacheOptions
                && cachedItem.age < aggressiveCacheOptions.duration
                && !cachedItem.mightHaveBeenModified
                && command.canCacheAggressively) {
                command.setResponse(cachedValue, true);
                return;
            }

            req.headers["If-None-Match"] = `"${cachedChangeVector}"`;
        }

        if (!this._disableClientConfigurationUpdates) {
            req.headers[HEADERS.CLIENT_CONFIGURATION_ETAG] = `"${this._clientConfigurationEtag}"`;
        }

        if (!this._disableTopologyUpdates) {
            req.headers[HEADERS.TOPOLOGY_ETAG] = `"${this._topologyEtag}"`;
        }

        const sp = Stopwatch.createStarted();
        let response: HttpResponse = null;
        let responseDispose: ResponseDisposeHandling = "Automatic";

        const result = BluebirdPromise.resolve()
            .then(() => {

                this.numberOfServerRequests++;

                return BluebirdPromise.resolve()
                    .then(() => this._shouldExecuteOnAll(chosenNode, command))
                    .then(shouldExecuteOnAll => {
                        if (shouldExecuteOnAll) {
                            return this._executeOnAllToFigureOutTheFastest(chosenNode, command);
                        } else {
                            return command.send(req);
                        }
                    });
            })
            .then(executionResult => {
                response = executionResult;
                sp.stop();
                return;
            }, (error) => {
                this._log.warn(
                    error, 
                    `Error executing '${command.constructor.name}' `
                        + `on specific node '${chosenNode.url}'`
                        + `${chosenNode.database ? "db " + chosenNode.database : "" }.`);

                if (!shouldRetry) {
                    return BluebirdPromise.reject(error);
                }

                sp.stop();

                return this._handleServerDown(
                    req.uri as string, chosenNode, nodeIndex, command, req, response, error, sessionInfo)
                    .then(serverDownHandledSuccessfully => {
                        if (!serverDownHandledSuccessfully) {
                            this._throwFailedToContactAllNodes(command, req, error, null);
                        }
                    });
            })
            .then(() => {
                command.statusCode = response.statusCode;

                const refreshTopology = response
                    && response.caseless
                    && response.caseless.get(HEADERS.REFRESH_TOPOLOGY);

                const refreshClientConfiguration = response
                    && response.caseless
                    && response.caseless.get(HEADERS.REFRESH_CLIENT_CONFIGURATION);

                return BluebirdPromise.resolve()
                    .then(() => {
                        if (response.statusCode === StatusCodes.NotModified) {
                            cachedItem.notModified();

                            if (command.responseType === "Object") {
                                command.setResponse(cachedValue, true);
                            }

                            return;
                        }

                        if (response.statusCode >= 400) {
                            return BluebirdPromise.resolve()
                                .then(() => this._handleUnsuccessfulResponse(
                                    chosenNode,
                                    nodeIndex,
                                    command,
                                    req,
                                    response,
                                    req.uri as string,
                                    sessionInfo,
                                    shouldRetry))
                                .then(unsuccessfulResponseHandled => {
                                    if (unsuccessfulResponseHandled) {
                                        return;
                                    }
                                    
                                    const dbMissingHeader = response.caseless.get(HEADERS.DATABASE_MISSING);
                                    if (dbMissingHeader) {
                                        throwError("DatabaseDoesNotExistException", dbMissingHeader as string);
                                    }

                                    if (command.failedNodes.size === 0) {
                                        throwError("InvalidOperationException", 
                                        "Received unsuccessful response and couldn't recover from it. "
                                            + "Also, no record of exceptions per failed nodes. "
                                            + "This is weird and should not happen.");
                                    }

                                    if (command.failedNodes.size === 1) {
                                        const values = [...command.failedNodes.values()];
                                        if (values && values.some(x => !!x)) {
                                            const err = values.filter(x => !!x).map(x => x)[0];
                                            throwError(err.name as RavenErrorType, err.message, err);
                                        }
                                    }

                                    throwError(
                                        "AllTopologyNodesDownException", 
                                        "Received unsuccessful response from all servers"
                                        + " and couldn't recover from it.");
                                });
                        }

                        responseDispose = command.processResponse(this._cache, response, req.uri as string);
                        this._lastReturnedResponse = new Date();
                    })
                    .finally(() => {
                        if (responseDispose === "Automatic") {
                            response.destroy();
                        }

                        if (refreshTopology || refreshClientConfiguration) {
                            const serverNode = new ServerNode({
                                url: chosenNode.url,
                                database: this._databaseName
                            });

                            const topologyTask = refreshTopology
                                ? BluebirdPromise.resolve(this.updateTopology(serverNode, 0))
                                    .tapCatch(err => this._log.warn(err, "Error refreshing topology."))
                                : BluebirdPromise.resolve(false);

                            const clientConfigurationTask = refreshClientConfiguration
                                ? BluebirdPromise.resolve(this._updateClientConfiguration())
                                    .tapCatch(err => this._log.warn(err, "Error refreshing client configuration."))
                                    .then(() => true)
                                : BluebirdPromise.resolve(false);

                            return BluebirdPromise.all([topologyTask, clientConfigurationTask]);
                        }
                    });
            });
        
        return Promise.resolve(result);
    }

    private _throwFailedToContactAllNodes<TResult> (
         command: RavenCommand<TResult>, 
         req: HttpRequestBase, 
         e: Error, 
         timeoutException: Error) {

        let message: string = "Tried to send " 
            + command.constructor.name 
            + " request via " 
            + (req.method || "GET") + " " 
            + req.uri + " to all configured nodes in the topology, " 
            + "all of them seem to be down or not responding. I've tried to access the following nodes: ";

        if (this._nodeSelector) {
            const topology = this._nodeSelector.getTopology();
            if (topology) {
                message += topology.nodes.map(x => x.url).join(", ");
            }
        }

        const tplFromNode = this._topologyTakenFromNode;
        if (tplFromNode && this._nodeSelector) {
            const topology = this._nodeSelector.getTopology();
            if (topology) {
                const nodesText = topology.nodes
                    .map(x => `( url: ${x.url}, clusterTag: ${x.clusterTag}, serverRole: ${x.serverRole})`)
                    .join(", ");
                
                message += os.EOL
                    + `I was able to fetch ${tplFromNode.database} topology from ${tplFromNode.url}.`
                    + os.EOL
                    + `Fetched topology: ${nodesText}`;
            }
        }

        const innerErr = timeoutException || e;
        throwError("AllTopologyNodesDownException", message, innerErr); 
    }

    public inSpeedTestPhase () {
        return this._nodeSelector
            && this._nodeSelector.inSpeedTestPhase();
    }

    private _handleUnsuccessfulResponse<TResult> (
        chosenNode: ServerNode,
        nodeIndex: number,
        command: RavenCommand<TResult>,
        req: HttpRequestBase,
        response: HttpResponse,
        url: string,
        sessionInfo: SessionInfo,
        shouldRetry: boolean): Promise<boolean> {
        switch (response.statusCode) {
            case StatusCodes.NotFound:
                this._cache.setNotFound(url);
                switch (command.responseType) {
                    case "Empty":
                        return Promise.resolve(true);
                    case "Object":
                        command.setResponse(null, false);
                        break;
                    default:
                        command.setResponseRaw(response, null);
                        break;
                }
                return Promise.resolve(true);

            case StatusCodes.Forbidden: // TBD: include info about certificates
                throwError("AuthorizationException",
                    `Forbidden access to ${chosenNode.database}@${chosenNode.url}`
                    + `, ${req.method || "GET"} ${req.uri}`);
            case StatusCodes.Gone:
                // request not relevant for the chosen node - the database has been moved to a different one
                if (!shouldRetry) {
                    return Promise.resolve(false);
                }

                return this.updateTopology(chosenNode, Number.MAX_VALUE, true)
                    .then(() => {
                        const currentIndexAndNode: CurrentIndexAndNode = 
                            this.chooseNodeForRequest(command, sessionInfo);
                        return this._executeOnSpecificNode(command, sessionInfo, {
                            chosenNode: currentIndexAndNode.currentNode,
                            nodeIndex: currentIndexAndNode.currentIndex,
                            shouldRetry: false
                        });
                    })
                    .then(() => true);
            case StatusCodes.GatewayTimeout:
            case StatusCodes.RequestTimeout:
            case StatusCodes.BadGateway:
            case StatusCodes.ServiceUnavailable:
                return this._handleServerDown(
                    url, chosenNode, nodeIndex, command, req, response, null, sessionInfo)
                    .then(() => false);
            case StatusCodes.Conflict:
                RequestExecutor._handleConflict(response);
            default:
                command.onResponseFailure(response);
                return Promise.reject(ExceptionDispatcher.throwException(response));
        }
    }

    private _executeOnAllToFigureOutTheFastest<TResult> (
        chosenNode: ServerNode,
        command: RavenCommand<TResult>): Promise<HttpResponse> {
        let preferredTask: BluebirdPromise<IndexAndResponse> = null;

        const nodes = this._nodeSelector.getTopology().nodes;
        const tasks: Array<BluebirdPromise<IndexAndResponse>> = nodes.map(x => null);

        let task: BluebirdPromise<IndexAndResponse>;
        for (let i = 0; i < nodes.length; i++) {
            const taskNumber = i;
            this.numberOfServerRequests++;

            task = BluebirdPromise.resolve()
                .then(() => {
                    const req = this._createRequest(nodes[taskNumber], command);
                    return command.send(req);
                })
                .then(commandResult => new IndexAndResponse(taskNumber, commandResult))
                .catch(err => {
                    tasks[taskNumber] = null;
                    return BluebirdPromise.reject(err);
                });

            if (nodes[i].clusterTag === chosenNode.clusterTag) {
                preferredTask = task;
            }

            tasks[i] = task;
        }

        const result = PromiseUtil.raceToResolution(tasks)
            .then(fastest => {
                this._nodeSelector.recordFastest(fastest.index, nodes[fastest.index]);
            })
            .catch((err) => {
                this._log.warn(err, "Error executing on all to find fastest node.");
            })
            .then(() => preferredTask)
            .then(taskResult => taskResult.response);
        
        return Promise.resolve(result);
    }

    private _shouldExecuteOnAll<TResult> (chosenNode: ServerNode, command: RavenCommand<TResult>): boolean {

        function hasMultipleNodes (): boolean {
            const sel = this._nodeSelector;
            return sel
                ? (sel.topology && sel.topology.nodes && sel.topology.nodes.length > 1)
                : false;
        }

        return this._readBalanceBehavior === "FastestNode" &&
            this._nodeSelector &&
            this._nodeSelector.inSpeedTestPhase() &&
            hasMultipleNodes() &&
            command.isReadRequest &&
            command.responseType === "Object" &&
            !!chosenNode;
    }

    private _handleServerDown<TResult> (
        url: string,
        chosenNode: ServerNode,
        nodeIndex: number,
        command: RavenCommand<TResult>,
        req: HttpRequestBase,
        response: HttpResponse,
        error: any,
        sessionInfo: SessionInfo): Promise<boolean> {

        if (!command.failedNodes) {
            command.failedNodes = new Map();
        }

        RequestExecutor._addFailedResponseToCommand(chosenNode, command, req, response, error);

        if (nodeIndex === null) {
            return Promise.resolve(false);
        }

        this._spawnHealthChecks(chosenNode, nodeIndex);

        if (!this._nodeSelector) {
            return Promise.resolve(false);
        }

        this._nodeSelector.onFailedRequest(nodeIndex);

        const currentIndexAndNode: CurrentIndexAndNode = this._nodeSelector.getPreferredNode();
        if (command.failedNodes.has(currentIndexAndNode.currentNode)) {
            return Promise.resolve(false) as any as Promise<boolean>; 
            // we tried all the nodes...nothing left to do
        }

        return Promise.resolve()
            .then(() => {
                return this._executeOnSpecificNode(command, sessionInfo, {
                    chosenNode: currentIndexAndNode.currentNode,
                    nodeIndex: currentIndexAndNode.currentIndex,
                    shouldRetry: false
                });
            })
            .then(() => true);
    }
    
    private static _addFailedResponseToCommand<TResult> (
        chosenNode: ServerNode, 
        command: RavenCommand<TResult>, 
        req: HttpRequestBase, 
        response: HttpResponse, 
        e: Error) {

        if (response && response.body) {
            const responseJson: string = response.body;
            try {
                const resExceptionSchema = JsonSerializer
                    .getDefaultForCommandPayload()
                    .deserialize<ExceptionSchema>(responseJson);
                const readException = ExceptionDispatcher.get(resExceptionSchema, response.statusCode);
                command.failedNodes.set(chosenNode, readException);
            } catch (_) {
                log.warn(_, "Error parsing server error.");
                const unrecongnizedErrSchema = {
                    url: req.uri,
                    message: "Unrecognized response from the server",
                    error: responseJson,
                    type: "Unparsable Server Response"
                };

                const exceptionToUse = ExceptionDispatcher.get(unrecongnizedErrSchema, response.statusCode);
                command.failedNodes.set(chosenNode, exceptionToUse);
            }

            return;
        }

        const exceptionSchema = {
            url: req.uri.toString(),
            message: e.message,
            error: e.stack,
            type: e.name
        };

        command.failedNodes.set(chosenNode, ExceptionDispatcher.get(exceptionSchema, StatusCodes.InternalServerError));
    }

    private _createRequest<TResult> (node: ServerNode, command: RavenCommand<TResult>): HttpRequestBase {
        const req = Object.assign(command.createRequest(node), getDefaultRequestOptions());
        req.headers = req.headers || {};

        if (this._authOptions) {
            const agentOptions = this._certificate.toAgentOptions();
            req.agentOptions = Object.assign(req.agentOptions || {}, agentOptions);
        }

        if (!req.headers["Raven-Client-Version"]) {
            req.headers["Raven-Client-Version"] = RequestExecutor.CLIENT_VERSION;
        }

        if (RequestExecutor.requestPostProcessor) {
            RequestExecutor.requestPostProcessor(req);
        }

        return req;
    }

    private static _handleConflict (response: HttpResponse): void {
        ExceptionDispatcher.throwException(response);
    }
    
    private _spawnHealthChecks (chosenNode: ServerNode, nodeIndex: number): void   {
        if (this._disposed) {
            return;
        }

        if (this._failedNodesTimers.has(chosenNode)) {
            return;
        }

        this._log.info(`Spawn health checks for node ${chosenNode.url}.`);

        const nodeStatus: NodeStatus = new NodeStatus(
            nodeIndex, 
            chosenNode, 
            (nStatus: NodeStatus) => this._checkNodeStatusCallback(nStatus));
        this._failedNodesTimers.set(chosenNode, nodeStatus);
        nodeStatus.startTimer();
    } 

    private _checkNodeStatusCallback (nodeStatus: NodeStatus): Promise<void> {
        const copy = this.getTopologyNodes();

        if (nodeStatus.nodeIndex >= copy.length) {
            return; // topology index changed / removed
        }

        const serverNode = copy[nodeStatus.nodeIndex];
        if (serverNode !== nodeStatus.node) {
            return;  // topology changed, nothing to check
        }

        const result = Promise.resolve()
            .then(() => {
                let status: NodeStatus;
                return Promise.resolve(this._performHealthCheck(serverNode, nodeStatus.nodeIndex))
                    .then(() => {
                        status = this._failedNodesTimers[nodeStatus.nodeIndex];
                        if (status) {
                            this._failedNodesTimers.delete(nodeStatus.node);
                            status.dispose();
                        }

                        if (this._nodeSelector) {
                            this._nodeSelector.restoreNodeIndex(nodeStatus.nodeIndex);
                        }
                    },
                    err => {
                        this._log.error(err, `${serverNode.clusterTag} is still down`);

                        status = this._failedNodesTimers.get(nodeStatus.node);
                        if (status) {
                            nodeStatus.updateTimer();
                        }
                    });
            })
            .catch(err => {
                this._log.error(
                    err, "Failed to check node topology, will ignore this node until next topology update.");
            }) ;

        return result;
    }

    protected _performHealthCheck (serverNode: ServerNode, nodeIndex: number): Promise<void> {
        return this._executeOnSpecificNode(
            RequestExecutor._failureCheckOperation.getCommand(this._conventions), 
            null, 
            { 
                chosenNode: serverNode,
                nodeIndex, 
                shouldRetry: false, 
            });
    }

    public dispose (): void {
        this._log.info("Dispose.");

        if (this._disposed) {
            return;
        }
        
        this._disposed = true;

        this._updateClientConfigurationSemaphore.take(() => {
            const sem = this._updateClientConfigurationSemaphore;
        });

        this._updateDatabaseTopologySemaphore.take(() => {
            const sem = this._updateDatabaseTopologySemaphore;
        });

        this._cache.dispose();

        if (this._updateTopologyTimer) {
            this._updateTopologyTimer.dispose();
        }
        
        this._disposeAllFailedNodesTimers();
    }
}
