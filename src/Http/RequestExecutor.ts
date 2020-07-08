import * as os from "os";
import * as BluebirdPromise from "bluebird";
import * as semaphore from "semaphore";
import * as stream from "readable-stream";
import { acquireSemaphore, SemaphoreAcquisitionContext } from "../Utility/SemaphoreUtil";
import { getLogger, ILogger } from "../Utility/LogUtil";
import { Timer } from "../Primitives/Timer";
import { ServerNode } from "./ServerNode";
import { RavenCommand, ResponseDisposeHandling } from "./RavenCommand";
import { Topology } from "./Topology";
import { GetDatabaseTopologyCommand } from "../ServerWide/Commands/GetDatabaseTopologyCommand";
import { StatusCodes } from "./StatusCode";
import { NodeSelector } from "./NodeSelector";
import { IDisposable } from "../Types/Contracts";
import { IRequestAuthOptions, IAuthOptions } from "../Auth/AuthOptions";
import { Certificate, ICertificate } from "../Auth/Certificate";
import { ReadBalanceBehavior } from "./ReadBalanceBehavior";
import { HttpCache, CachedItemMetadata, ReleaseCacheItem } from "./HttpCache";
import { AggressiveCacheOptions } from "./AggressiveCacheOptions";
import { throwError, RavenErrorType, ExceptionDispatcher, ExceptionSchema, getError } from "../Exceptions";
import {
    GetClientConfigurationCommand,
    GetClientConfigurationOperationResult
} from "../Documents/Operations/Configuration/GetClientConfigurationOperation";
import CurrentIndexAndNode from "./CurrentIndexAndNode";
import { HEADERS, CONSTANTS } from "../Constants";
import { HttpRequestParameters, HttpResponse, HttpRequestParametersWithoutUri } from "../Primitives/Http";
import { Stopwatch } from "../Utility/Stopwatch";
import * as PromiseUtil from "../Utility/PromiseUtil";
import { GetStatisticsOperation } from "../Documents/Operations/GetStatisticsOperation";
import { DocumentConventions } from "../Documents/Conventions/DocumentConventions";
import { TypeUtil } from "../Utility/TypeUtil";
import { SessionInfo } from "../Documents/Session/IDocumentSession";
import { JsonSerializer } from "../Mapping/Json/Serializer";
import { validateUri } from "../Utility/UriUtil";
import * as StreamUtil from "../Utility/StreamUtil";
import { closeHttpResponse } from "../Utility/HttpUtil";
import { PromiseStatusTracker } from "../Utility/PromiseUtil";
import * as http from "http";
import * as https from "https";

const DEFAULT_REQUEST_OPTIONS = {};

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

    public static readonly CLIENT_VERSION = "4.1.0";

    private _updateDatabaseTopologySemaphore = semaphore();
    private _updateClientConfigurationSemaphore = semaphore();

    private static _failureCheckOperation = new GetStatisticsOperation("failure=check");

    private _failedNodesTimers: Map<ServerNode, NodeStatus> = new Map();
    protected _databaseName: string;
    protected _certificate: ICertificate = null;

    private _lastReturnedResponse: Date;
    protected _readBalanceBehavior: ReadBalanceBehavior;

    private readonly _cache: HttpCache;

    private _topologyTakenFromNode: ServerNode;

    public aggressiveCaching: AggressiveCacheOptions = null;

    private _updateTopologyTimer: Timer;

    protected _nodeSelector: NodeSelector;

    public numberOfServerRequests: number = 0;

    protected _disposed: boolean;

    private _firstTopologyUpdatePromiseInternal;

    private _httpAgent: http.Agent;

    private static readonly KEEP_ALIVE_HTTP_AGENT = new http.Agent({
        keepAlive: true
    });

    private static readonly HTTPS_AGENT_CACHE = new Map<string, https.Agent>();

    protected get _firstTopologyUpdatePromise(): Promise<void> {
        return this._firstTopologyUpdatePromiseInternal;
    }

    protected set _firstTopologyUpdatePromise(value: Promise<void>) {
        this._firstTopologyUpdatePromiseInternal = value;

        if (value) {
            this._firstTopologyUpdateStatus = PromiseStatusTracker.track(value);
        }
    }

    protected _firstTopologyUpdateStatus: PromiseStatusTracker<void>;

    protected _lastKnownUrls: string[];

    protected _clientConfigurationEtag: number = 0;

    protected _topologyEtag: number = 0;

    private readonly _conventions: DocumentConventions;

    private readonly _authOptions: IAuthOptions;

    protected _disableTopologyUpdates: boolean;

    protected _disableClientConfigurationUpdates: boolean;

    protected _customHttpRequestOptions: HttpRequestParametersWithoutUri;

    protected _defaultRequestOptions: HttpRequestParametersWithoutUri;

    public static requestPostProcessor: (req: HttpRequestParameters) => void = null;

    public get customHttpRequestOptions(): HttpRequestParametersWithoutUri {
        return this._customHttpRequestOptions;
    }

    public set customHttpRequestOptions(value: HttpRequestParametersWithoutUri) {
        this._customHttpRequestOptions = value;
        this._setDefaultRequestOptions();
    }

    public getAuthOptions(): IAuthOptions {
        return this._authOptions;
    }

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

    public getUrl(): string {
        if (!this._nodeSelector) {
            return null;
        }

        const preferredNode = this._nodeSelector.getPreferredNode();

        return preferredNode
            ? preferredNode.currentNode.url
            : null;
    }

    public getTopology(): Topology {
        return this._nodeSelector
            ? this._nodeSelector.getTopology()
            : null;
    }

    public getHttpAgent(): http.Agent {
        if (this._httpAgent) {
            return this._httpAgent;
        }

        return this._httpAgent = this._createHttpAgent();
    }

    private _createHttpAgent(): http.Agent {
        if (this._certificate) {
            const agentOptions = this._certificate.toAgentOptions();
            const cacheKey = JSON.stringify(agentOptions, null, 0);
            if (RequestExecutor.HTTPS_AGENT_CACHE.has(cacheKey)) {
                return RequestExecutor.HTTPS_AGENT_CACHE.get(cacheKey);
            } else {
                const agent = new https.Agent({
                    keepAlive: true,
                    ...agentOptions
                });

                RequestExecutor.HTTPS_AGENT_CACHE.set(cacheKey, agent);
                return agent;
            }
        } else {
            return RequestExecutor.KEEP_ALIVE_HTTP_AGENT;
        }
    }

    public getTopologyNodes(): ServerNode[] {
        const topology = this.getTopology();
        return topology
            ? [...topology.nodes]
            : null;
    }

    protected constructor(
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
        this._setDefaultRequestOptions();
    }

    public static create(
        initialUrls: string[],
        database: string): RequestExecutor;
    public static create(
        initialUrls: string[],
        database: string,
        opts?: IRequestExecutorOptions): RequestExecutor;
    public static create(
        initialUrls: string[],
        database: string,
        opts?: IRequestExecutorOptions): RequestExecutor {
        const { authOptions, documentConventions } = opts || {} as IRequestExecutorOptions;
        const executor = new RequestExecutor(database, authOptions, documentConventions);
        executor._firstTopologyUpdatePromise = executor._firstTopologyUpdate(initialUrls);

        // this is just to get rid of unhandled rejection, we're handling it later on
        executor._firstTopologyUpdatePromise.catch(TypeUtil.NOOP);
        
        return executor;
    }

    public static createForSingleNodeWithConfigurationUpdates(
        url: string, database: string, opts: IRequestExecutorOptions): RequestExecutor {
        const executor =
            this.createForSingleNodeWithoutConfigurationUpdates(
                url, database, opts);
        executor._disableClientConfigurationUpdates = false;
        return executor;
    }

    public static createForSingleNodeWithoutConfigurationUpdates(
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

    private async _ensureNodeSelector(): Promise<void> {
        if (this._firstTopologyUpdatePromise
            && (!this._firstTopologyUpdateStatus.isFullfilled()
                || this._firstTopologyUpdateStatus.isRejected())) {
            await this._firstTopologyUpdatePromise;
        }

        if (!this._nodeSelector) {
            const topology = new Topology(this._topologyEtag, this.getTopologyNodes().slice());
            this._nodeSelector = new NodeSelector(topology);
        }
    }

    public async getPreferredNode(): Promise<CurrentIndexAndNode> {
        await this._ensureNodeSelector();
        return this._nodeSelector.getPreferredNode();
    }

    public async getNodeBySessionId(sessionId: number): Promise<CurrentIndexAndNode> {
        await this._ensureNodeSelector();
        return this._nodeSelector.getNodeBySessionId(sessionId);
    }

    public async getFastestNode(): Promise<CurrentIndexAndNode> {
        await this._ensureNodeSelector();
        return this._nodeSelector.getFastestNode();
    }

    private async _updateClientConfigurationInternal(): Promise<void> {
        const oldDisableClientConfigurationUpdates = this._disableClientConfigurationUpdates;
        this._disableClientConfigurationUpdates = true;

        try {
            if (this._disposed) {
                return;
            }

            const command = new GetClientConfigurationCommand();
            const { currentNode, currentIndex } = this.chooseNodeForRequest(command, null);
            await this.execute(command, null, {
                chosenNode: currentNode,
                nodeIndex: currentIndex,
                shouldRetry: false
            });

            const clientConfigOpResult = command.result;
            if (!clientConfigOpResult) {
                return;
            }

            this._conventions.updateFrom(clientConfigOpResult.configuration);
            this._clientConfigurationEtag = clientConfigOpResult.etag;
        } catch (err) {
            this._log.error(err, "Error getting client configuration.");
        } finally {
            this._disableClientConfigurationUpdates = oldDisableClientConfigurationUpdates;
        }
    }

    protected async _updateClientConfiguration(): Promise<void> {
        if (this._disposed) {
            return;
        }

        let semAcquiredContext: SemaphoreAcquisitionContext;

        try {
            semAcquiredContext = acquireSemaphore(this._updateClientConfigurationSemaphore);
            await semAcquiredContext.promise;
            await this._updateClientConfigurationInternal();
        } finally {
            if (semAcquiredContext) {
                semAcquiredContext.dispose();
            }
        }
    }

    public updateTopology(node: ServerNode, timeout: number, forceUpdate: boolean = false, debugTag?: string): Promise<boolean> {
        if (this._disposed) {
            return Promise.resolve(false);
        }

        if (this._disableTopologyUpdates) {
            return Promise.resolve(false);
        }

        const acquiredSemContext = acquireSemaphore(this._updateDatabaseTopologySemaphore, { timeout });
        const result = BluebirdPromise.resolve(acquiredSemContext.promise)
            .then(() => {
                    if (this._disposed) {
                        return false;
                    }

                    this._log.info(`Update topology from ${node.url}.`);

                    const getTopology = new GetDatabaseTopologyCommand(debugTag);
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

    private _initializeUpdateTopologyTimer(): void {
        if (this._updateTopologyTimer || this._disposed) {
            return;
        }

        this._log.info("Initialize update topology timer.");

        const minInMs = 60 * 1000;
        const that = this;
        this._updateTopologyTimer =
            new Timer(function timerActionUpdateTopology() {
                return that._updateTopologyCallback();
            }, minInMs, minInMs);
    }

    private _updateTopologyCallback(): Promise<void> {
        const time = new Date();
        const minInMs = 60 * 1000;
        if (time.valueOf() - this._lastReturnedResponse.valueOf() <= minInMs) {
            return;
        }

        let serverNode: ServerNode;

        try {
            const selector = this._nodeSelector;
            if (!selector) {
                return;
            }
            const preferredNode: CurrentIndexAndNode = selector.getPreferredNode();
            serverNode = preferredNode.currentNode;
        } catch (err) {
            this._log.warn(err, "Couldn't get preferred node Topology from _updateTopologyTimer");
            return;
        }

        return this.updateTopology(serverNode, 0, false, "timer-callback")
            .catch(err => {
                this._log.error(err, "Couldn't update topology from _updateTopologyTimer");
                return null;
            });
    }

    protected async _firstTopologyUpdate(inputUrls: string[]): Promise<void> {
        const initialUrls: string[] = RequestExecutor._validateUrls(inputUrls, this._authOptions);

        const topologyUpdateErrors: { url: string, error: Error | string }[] = [];

        const tryUpdateTopology = async (url: string, database: string): Promise<boolean> => {
            const serverNode = new ServerNode({ url, database });
            try {
                await this.updateTopology(serverNode, TypeUtil.MAX_INT32, false, "first-topology-update");
                this._initializeUpdateTopologyTimer();
                this._topologyTakenFromNode = serverNode;
                return true;
            } catch (error) {
                if ((error.name as RavenErrorType) === "AuthorizationException") {
                    this._lastKnownUrls = initialUrls;
                    throw error;
                }

                if ((error.name as RavenErrorType) === "DatabaseDoesNotExistException") {
                    this._lastKnownUrls = initialUrls;
                    throw error;
                }

                if (initialUrls.length === 0) {
                    this._lastKnownUrls = initialUrls;
                    throwError("InvalidOperationException",
                        `Cannot get topology from server: ${url}.`, error);
                }

                topologyUpdateErrors.push({ url, error });
                return false;
            }
        };

        const tryUpdateTopologyOnAllNodes = async () => {
            for (const url of initialUrls) {
                if (await tryUpdateTopology(url, this._databaseName)) {
                    return;
                }
            }

            return false;
        };

        await tryUpdateTopologyOnAllNodes();
        const topology = new Topology();
        topology.etag = this._topologyEtag;

        let topologyNodes = this.getTopologyNodes();
        if (!topologyNodes) {
            topologyNodes = initialUrls.map(url => {
                const serverNode = new ServerNode({
                    url,
                    database: this._databaseName
                });
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
    }

    protected _throwExceptions(details: string): void {
        throwError("InvalidOperationException",
            "Failed to retrieve database topology from all known nodes"
            + os.EOL + details);
    }

    protected _disposeAllFailedNodesTimers(): void {
        for (const item of this._failedNodesTimers) {
            item[1].dispose();
        }

        this._failedNodesTimers.clear();
    }

    public chooseNodeForRequest<TResult>(cmd: RavenCommand<TResult>, sessionInfo: SessionInfo): CurrentIndexAndNode {
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

    public execute<TResult>(command: RavenCommand<TResult>): Promise<void>;
    public execute<TResult>(command: RavenCommand<TResult>, sessionInfo?: SessionInfo): Promise<void>;
    public execute<TResult>(
        command: RavenCommand<TResult>, sessionInfo?: SessionInfo, options?: ExecuteOptions<TResult>): Promise<void>;
    public execute<TResult>(
        command: RavenCommand<TResult>,
        sessionInfo?: SessionInfo,
        options?: ExecuteOptions<TResult>): Promise<void> {

        if (options) {
            return this._executeOnSpecificNode(command, sessionInfo, options);
        }

        this._log.info(`Execute command ${command.constructor.name}`);

        const topologyUpdate = this._firstTopologyUpdatePromise;
        const topologyUpdateStatus = this._firstTopologyUpdateStatus;
        if ((topologyUpdate && topologyUpdateStatus.isResolved()) || this._disableTopologyUpdates) {
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

    private async _unlikelyExecute<TResult>(
        command: RavenCommand<TResult>,
        topologyUpdate: Promise<void>,
        sessionInfo: SessionInfo): Promise<void> {

        try {
            if (!this._firstTopologyUpdatePromise) {
                if (!this._lastKnownUrls) {
                    throwError("InvalidOperationException",
                        "No known topology and no previously known one, cannot proceed, likely a bug");
                }

                topologyUpdate = this._firstTopologyUpdate(this._lastKnownUrls);
            }

            await topologyUpdate;

        } catch (reason) {
            if (this._firstTopologyUpdatePromise === topologyUpdate) {
                this._firstTopologyUpdatePromise = null; // next request will raise it
            }

            this._log.warn(reason, "Error doing topology update.");

            throw reason;
        }

        const currentIndexAndNode: CurrentIndexAndNode = this.chooseNodeForRequest(command, sessionInfo);
        return this._executeOnSpecificNode(command, sessionInfo, {
            chosenNode: currentIndexAndNode.currentNode,
            nodeIndex: currentIndexAndNode.currentIndex,
            shouldRetry: true
        });
    }

    private _getFromCache<TResult>(
        command: RavenCommand<TResult>,
        useCache: boolean,
        url: string,
        cachedItemMetadataCallback: (data: CachedItemMetadata) => void) {

        if (useCache 
            && command.canCache
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

    private async _executeOnSpecificNode<TResult>(
        command: RavenCommand<TResult>,
        sessionInfo: SessionInfo = null,
        options: ExecuteOptions<TResult> = null): Promise<void> {

        const { chosenNode, nodeIndex, shouldRetry } = options;

        this._log.info(`Actual execute ${command.constructor.name} on ${chosenNode.url}`
            + ` ${ shouldRetry ? "with" : "without" } retry.`);

        const req: HttpRequestParameters = this._createRequest(chosenNode, command);
        const noCaching = sessionInfo ? sessionInfo.noCaching : false;

        let cachedChangeVector: string;
        let cachedValue: string;
        const cachedItem = this._getFromCache(
            command, !noCaching, req.uri.toString(), (cachedItemMetadata) => {
                cachedChangeVector = cachedItemMetadata.changeVector;
                cachedValue = cachedItemMetadata.response;
            });

        if (cachedChangeVector) {
            const aggressiveCacheOptions = this.aggressiveCaching;
            if (aggressiveCacheOptions
                && cachedItem.age < aggressiveCacheOptions.duration
                && !cachedItem.mightHaveBeenModified
                && command.canCacheAggressively) {
                return command.setResponseFromCache(cachedValue);
            }

            req.headers["If-None-Match"] = `"${cachedChangeVector}"`;
        }

        if (!this._disableClientConfigurationUpdates) {
            req.headers[HEADERS.CLIENT_CONFIGURATION_ETAG] = `"${this._clientConfigurationEtag}"`;
        }

        if (sessionInfo && sessionInfo.lastClusterTransactionIndex) {
            req.headers[HEADERS.LAST_KNOWN_CLUSTER_TRANSACTION_INDEX] = 
                sessionInfo.lastClusterTransactionIndex;
        }

        if (!this._disableTopologyUpdates) {
            req.headers[HEADERS.TOPOLOGY_ETAG] = `"${this._topologyEtag}"`;
        }

        const sp = Stopwatch.createStarted();
        let response: HttpResponse = null;
        let responseDispose: ResponseDisposeHandling = "Automatic";

        let bodyStream: stream.Readable;

        this.numberOfServerRequests++;

        try {
            if (this._shouldExecuteOnAll(chosenNode, command)) {
                response = await this._executeOnAllToFigureOutTheFastest(chosenNode, command);
            } else {
                const responseAndBody = await command.send(this.getHttpAgent(), req);
                bodyStream = responseAndBody.bodyStream;
                response = responseAndBody.response;
            }
            
            if (sessionInfo && sessionInfo.lastClusterTransactionIndex) {
                // if we reach here it means that sometime a cluster transaction has occurred against this database.
                // Since the current executed command can be dependent on that, 
                // we have to wait for the cluster transaction.
                // But we can't do that if the server is an old one.
                const version = response.headers.get(HEADERS.SERVER_VERSION);
                if (version && "4.1" === version) {
                    throwError(
                        "ClientVersionMismatchException",
                        "The server on " + chosenNode.url + " has an old version and can't perform "
                        + "the command since this command dependent on a cluster transaction "
                        + " which this node doesn't support.");
                }
            }

            sp.stop();
        } catch (error) {
            this._log.warn(
                error,
                `Error executing '${command.constructor.name}' `
                + `on specific node '${chosenNode.url}'`
                + `${chosenNode.database ? "db " + chosenNode.database : ""}.`);

            if (!shouldRetry) {
                throw error; 
            }

            sp.stop();

            const serverDownHandledSuccessfully = await this._handleServerDown(
                req.uri as string, chosenNode, nodeIndex, command, req, response, null, error, sessionInfo, shouldRetry);
            
            if (!serverDownHandledSuccessfully) {
                this._throwFailedToContactAllNodes(command, req, error, null);
            }
            return;
        }

        command.statusCode = response.status;

        const refreshTopology = response
            && response.headers
            && response.headers.get(HEADERS.REFRESH_TOPOLOGY);

        const refreshClientConfiguration = response
            && response.headers
            && response.headers.get(HEADERS.REFRESH_CLIENT_CONFIGURATION);

        try {

            if (response.status === StatusCodes.NotModified) {
                cachedItem.notModified();

                if (command.responseType === "Object") {
                    await command.setResponseFromCache(cachedValue);
                }

                return;
            }

            if (response.status >= 400) {
                const unsuccessfulResponseHandled = await this._handleUnsuccessfulResponse(
                    chosenNode,
                    nodeIndex,
                    command,
                    req,
                    response,
                    bodyStream,
                    req.uri as string,
                    sessionInfo,
                    shouldRetry);

                if (!unsuccessfulResponseHandled) {

                    const dbMissingHeader = response.headers.get(HEADERS.DATABASE_MISSING);
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
                }

                return; // we either handled this already in the unsuccessful response or we are throwing
            }

            responseDispose = await command.processResponse(this._cache, response, bodyStream, req.uri as string);
            this._lastReturnedResponse = new Date();
        } finally {
            if (responseDispose === "Automatic") {
                closeHttpResponse(response);
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

                await Promise.all([topologyTask, clientConfigurationTask]);
            }
        }
    }

    private _throwFailedToContactAllNodes<TResult>(
        command: RavenCommand<TResult>,
        req: HttpRequestParameters,
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

    public inSpeedTestPhase() {
        return this._nodeSelector
            && this._nodeSelector.inSpeedTestPhase();
    }

    private async _handleUnsuccessfulResponse<TResult>(
        chosenNode: ServerNode,
        nodeIndex: number,
        command: RavenCommand<TResult>,
        req: HttpRequestParameters,
        response: HttpResponse,
        responseBodyStream: stream.Readable,
        url: string,
        sessionInfo: SessionInfo,
        shouldRetry: boolean): Promise<boolean> {
        responseBodyStream.resume();
        const readBody = () => StreamUtil.readToEnd(responseBodyStream);
        switch (response.status) {
            case StatusCodes.NotFound:
                this._cache.setNotFound(url);
                switch (command.responseType) {
                    case "Empty":
                        return Promise.resolve(true);
                    case "Object":
                        return command.setResponseAsync(null, false)
                            .then(() => true);
                    default:
                        command.setResponseRaw(response, null);
                        break;
                }
                return true;

            case StatusCodes.Forbidden:
                throwError("AuthorizationException",
                    `Forbidden access to ${chosenNode.database}@${chosenNode.url}`
                    + `, ${req.method || "GET"} ${req.uri}`);
                break;
            case StatusCodes.Gone:
                // request not relevant for the chosen node - the database has been moved to a different one
                if (!shouldRetry) {
                    return false;
                }

                if (nodeIndex != null) {
                    this._nodeSelector.onFailedRequest(nodeIndex);
                }

                if (!command.failedNodes) {
                    command.failedNodes = new Map();
                }

                if (command.isFailedWithNode(chosenNode)) {
                    command.failedNodes.set(chosenNode, getError("UnsuccessfulRequestException",
                        "Request to " + url + "(" + req.method + ") is not relevant for this node anymore."));
                }

                let indexAndNode = this.chooseNodeForRequest(command, sessionInfo);

                if (command.failedNodes.has(indexAndNode.currentNode)) {
                    // we tried all the nodes, let's try to update topology and retry one more time
                    const success = await this.updateTopology(chosenNode, 60 * 1000, true, "handle-unsuccessful-response");
                    if (!success) {
                        return false;
                    }

                    command.failedNodes.clear(); // we just update the topology
                    indexAndNode = this.chooseNodeForRequest(command, sessionInfo);

                    await this._executeOnSpecificNode(command, sessionInfo, {
                        chosenNode: indexAndNode.currentNode,
                        nodeIndex: indexAndNode.currentIndex,
                        shouldRetry: false
                    });
                    return true;
                }

                await this._executeOnSpecificNode(command, sessionInfo, {
                    chosenNode: indexAndNode.currentNode,
                    nodeIndex: indexAndNode.currentIndex,
                    shouldRetry: false
                });
                return true;
            case StatusCodes.GatewayTimeout:
            case StatusCodes.RequestTimeout:
            case StatusCodes.BadGateway:
            case StatusCodes.ServiceUnavailable:
                return this._handleServerDown(
                    url, chosenNode, nodeIndex, command, req, response, await readBody(), null, sessionInfo, shouldRetry);
            case StatusCodes.Conflict:
                RequestExecutor._handleConflict(response, await readBody());
                break;
            default:
                command.onResponseFailure(response);
                ExceptionDispatcher.throwException(response, await readBody());
        }
    }

    private _executeOnAllToFigureOutTheFastest<TResult>(
        chosenNode: ServerNode,
        command: RavenCommand<TResult>): Promise<HttpResponse> {
        let preferredTask: BluebirdPromise<IndexAndResponse> = null;

        const nodes = this._nodeSelector.getTopology().nodes;
        const tasks: BluebirdPromise<IndexAndResponse>[] = nodes.map(x => null);

        let task: BluebirdPromise<IndexAndResponse>;
        for (let i = 0; i < nodes.length; i++) {
            const taskNumber = i;
            this.numberOfServerRequests++;

            task = BluebirdPromise.resolve()
                .then(() => {
                    const req = this._createRequest(nodes[taskNumber], command);
                    return command.send(this.getHttpAgent(), req)
                        .then(responseAndBodyStream => {
                            return responseAndBodyStream.response;
                        });
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

    private _shouldExecuteOnAll<TResult>(chosenNode: ServerNode, command: RavenCommand<TResult>): boolean {
        return this._readBalanceBehavior === "FastestNode" &&
            this._nodeSelector &&
            this._nodeSelector.inSpeedTestPhase() &&
            this._nodeSelectorHasMultipleNodes() &&
            command.isReadRequest &&
            command.responseType === "Object" &&
            !!chosenNode;
    }

    private _nodeSelectorHasMultipleNodes() {
        const selector = this._nodeSelector;
        if (!selector) {
            return false;
        }
        const topology = selector.getTopology();
        return topology && topology.nodes && topology.nodes.length > 1;
    }

    private async _handleServerDown<TResult>(
        url: string,
        chosenNode: ServerNode,
        nodeIndex: number,
        command: RavenCommand<TResult>,
        req: HttpRequestParameters,
        response: HttpResponse,
        body: string,
        error: any,
        sessionInfo: SessionInfo,
        shouldRetry: boolean): Promise<boolean> {

        if (!command.failedNodes) {
            command.failedNodes = new Map();
        }

        RequestExecutor._addFailedResponseToCommand(chosenNode, command, req, response, body, error);

        if (nodeIndex === null) {
            return false;
        }

        this._spawnHealthChecks(chosenNode, nodeIndex);

        if (!this._nodeSelector) {
            return false;
        }

        this._nodeSelector.onFailedRequest(nodeIndex);

        const currentIndexAndNode: CurrentIndexAndNode = this._nodeSelector.getPreferredNode();
        if (command.failedNodes.has(currentIndexAndNode.currentNode)) {
            return false;
            // we tried all the nodes...nothing left to do
        }

        await this._executeOnSpecificNode(command, sessionInfo, {
                    chosenNode: currentIndexAndNode.currentNode,
                    nodeIndex: currentIndexAndNode.currentIndex,
                    shouldRetry
                });

        return true;
    }

    private static _addFailedResponseToCommand<TResult>(
        chosenNode: ServerNode,
        command: RavenCommand<TResult>,
        req: HttpRequestParameters,
        response: HttpResponse,
        body: string,
        e: Error) {

        if (response && body) {
            const responseJson: string = body;
            try {
                const resExceptionSchema = JsonSerializer
                    .getDefaultForCommandPayload()
                    .deserialize<ExceptionSchema>(responseJson);
                const readException = ExceptionDispatcher.get(resExceptionSchema, response.status, e);
                command.failedNodes.set(chosenNode, readException);
            } catch (__) {
                log.warn(__, "Error parsing server error.");
                const unrecognizedErrSchema = {
                    url: req.uri as string,
                    message: "Unrecognized response from the server",
                    error: responseJson,
                    type: "Unparsable Server Response"
                };

                const exceptionToUse = ExceptionDispatcher.get(unrecognizedErrSchema, response.status, e);
                command.failedNodes.set(chosenNode, exceptionToUse);
            }

            return;
        }

        const exceptionSchema = {
            url: req.uri.toString(),
            message: e.message,
            error: `An exception occurred while contacting ${ req.uri } . ${ os.EOL + e.stack }`,
            type: e.name
        };

        command.failedNodes.set(chosenNode, ExceptionDispatcher.get(exceptionSchema, StatusCodes.ServiceUnavailable, e));
    }

    private _createRequest<TResult>(node: ServerNode, command: RavenCommand<TResult>): HttpRequestParameters {
        const req = Object.assign(command.createRequest(node), this._defaultRequestOptions);
        req.headers = req.headers || {};

        if (!req.headers[HEADERS.CLIENT_VERSION]) {
            req.headers[HEADERS.CLIENT_VERSION] = RequestExecutor.CLIENT_VERSION;
        }

        if (RequestExecutor.requestPostProcessor) {
            RequestExecutor.requestPostProcessor(req);
        }

        return req;
    }

    private static _handleConflict(response: HttpResponse, body: string): void {
        ExceptionDispatcher.throwException(response, body);
    }

    public async handleServerNotResponsive(url: string, chosenNode: ServerNode, nodeIndex: number, e: Error) {
        this._spawnHealthChecks(chosenNode, nodeIndex);
        if (this._nodeSelector) {
            this._nodeSelector.onFailedRequest(nodeIndex);
        }

        const preferredNode = await this.getPreferredNode();
        await this.updateTopology(preferredNode.currentNode, 0, true, "handle-server-not-responsive");
        return preferredNode.currentNode;
    }

    private _spawnHealthChecks(chosenNode: ServerNode, nodeIndex: number): void {
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

    private _checkNodeStatusCallback(nodeStatus: NodeStatus): Promise<void> {
        const copy = this.getTopologyNodes();

        if (nodeStatus.nodeIndex >= copy.length) {
            return; // topology index changed / removed
        }

        const serverNode = copy[nodeStatus.nodeIndex];
        if (serverNode !== nodeStatus.node) {
            return;  // topology changed, nothing to check
        }

        return Promise.resolve()
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
            });
    }

    protected _performHealthCheck(serverNode: ServerNode, nodeIndex: number): Promise<void> {
        return this._executeOnSpecificNode(
            RequestExecutor._failureCheckOperation.getCommand(this._conventions),
            null,
            {
                chosenNode: serverNode,
                nodeIndex,
                shouldRetry: false,
            });
    }

    private _setDefaultRequestOptions(): void {
        this._defaultRequestOptions = Object.assign(
            DEFAULT_REQUEST_OPTIONS,
            {
                compress: !(this._conventions.hasExplicitlySetCompressionUsage && !this._conventions.useCompression)
            },
            this._customHttpRequestOptions);
    }

    public dispose(): void {
        this._log.info("Dispose.");

        if (this._disposed) {
            return;
        }

        this._disposed = true;

        this._updateClientConfigurationSemaphore.take(TypeUtil.NOOP);

        this._updateDatabaseTopologySemaphore.take(TypeUtil.NOOP);

        this._cache.dispose();

        if (this._updateTopologyTimer) {
            this._updateTopologyTimer.dispose();
        }

        this._disposeAllFailedNodesTimers();
    }
}
