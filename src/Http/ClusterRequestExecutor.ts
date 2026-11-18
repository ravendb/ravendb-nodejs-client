import { GetClusterTopologyCommand } from "../ServerWide/Commands/GetClusterTopologyCommand.js";
import { NodeSelector } from "./NodeSelector.js";
import { getLogger } from "../Utility/LogUtil.js";
import { RequestExecutor, IRequestExecutorOptions } from "./RequestExecutor.js";
import { throwError } from "../Exceptions/index.js";
import { ServerNode } from "./ServerNode.js";
import { Topology } from "./Topology.js";
import { GetTcpInfoCommand } from "../ServerWide/Commands/GetTcpInfoCommand.js";
import { IAuthOptions } from "../Auth/AuthOptions.js";
import { acquireSemaphore } from "../Utility/SemaphoreUtil.js";
import { DocumentConventions } from "../Documents/Conventions/DocumentConventions.js";
import { UpdateTopologyParameters } from "./UpdateTopologyParameters.js";
import { HEADERS } from "../Constants.js";
import { Semaphore } from "../Utility/Semaphore.js";
import { EOL } from "../Utility/OsUtil.js";
import { TopologyCacheKind, trySaveTopology } from "./TopologyLocalCache.js";

const log = getLogger({ module: "ClusterRequestExecutor" });

export class ClusterRequestExecutor extends RequestExecutor {

    protected readonly _topologyCacheKind: TopologyCacheKind = "cluster";

    private _clusterTopologySemaphore = new Semaphore();

    protected constructor(authOptions: IAuthOptions, conventions: DocumentConventions) {
        super(null, authOptions, conventions);
    }

    public static createForSingleNodeWithConfigurationUpdates(
        url: string, databaseName: string, opts: IRequestExecutorOptions)
        : ClusterRequestExecutor {
        return throwError("NotSupportedException");
    }

    public static createForSingleNodeWithoutConfigurationUpdates(
        url: string, databaseName: string, opts: IRequestExecutorOptions)
        : ClusterRequestExecutor {
        return throwError("NotSupportedException");
    }

    public static createForSingleNode(
        url: string, opts: IRequestExecutorOptions): ClusterRequestExecutor {
        const initialUrls = [url];

        const { authOptions, documentConventions } = opts;
        const urls = this.validateUrls(initialUrls, authOptions);

        const executor = new ClusterRequestExecutor(
            authOptions, documentConventions || DocumentConventions.defaultConventions);

        const serverNode = new ServerNode({ url: urls[0], serverRole: "Member" });

        const topology = new Topology(-1, [serverNode]);

        const nodeSelector = new NodeSelector(topology);

        executor._nodeSelector = nodeSelector;
        executor._topologyEtag = -2;
        executor._disableClientConfigurationUpdates = true;
        executor._disableTopologyUpdates = true;
        executor._topologyHeaderName = HEADERS.CLUSTER_TOPOLOGY_ETAG;

        executor.firstTopologyUpdatePromise = executor._singleTopologyUpdateAsync(urls, null);

        return executor;
    }

    public static create(
        initialUrls: string[],
        database: string,
        opts?: IRequestExecutorOptions): ClusterRequestExecutor;
    public static create(
        initialUrls: string[], opts?: IRequestExecutorOptions): ClusterRequestExecutor;
    public static create(
        initialUrls: string[],
        databaseOrOpts?: string | IRequestExecutorOptions,
        opts?: IRequestExecutorOptions): ClusterRequestExecutor {

        if (typeof (databaseOrOpts) === "string") {
            return throwError("NotSupportedException");
        }

        const { authOptions, documentConventions } = (opts || databaseOrOpts) || {} as IRequestExecutorOptions;

        const executor = new ClusterRequestExecutor(
            authOptions,
            documentConventions ?? DocumentConventions.defaultConventions);

        executor._disableClientConfigurationUpdates = true;
        executor.firstTopologyUpdatePromise = executor._firstTopologyUpdate(initialUrls, null);
        executor._topologyHeaderName = HEADERS.CLUSTER_TOPOLOGY_ETAG;
        return executor;
    }

    protected _performHealthCheck(serverNode: ServerNode, nodeIndex: number): Promise<void> {
        return this.execute(new GetTcpInfoCommand("health-check"), null, {
            chosenNode: serverNode,
            nodeIndex,
            shouldRetry: false
        });
    }

    public async updateTopology(parameters: UpdateTopologyParameters): Promise<boolean> {
        if (this._disposed) {
            return false;
        }

        if (this._disableTopologyUpdates) {
            return false;
        }

        const acquiredSemContext = acquireSemaphore(this._clusterTopologySemaphore, { timeout: parameters.timeoutInMs });
        try {
            await acquiredSemContext.promise;

            if (this._disposed) {
                return false;
            }

            const command = new GetClusterTopologyCommand(parameters.debugTag);
            await this.execute(command, null, {
                chosenNode: parameters.node,
                nodeIndex: null,
                shouldRetry: false
            });

            const results = command.result;
            const newTopology = ServerNode.createFrom(results.topology, results.etag);
            await trySaveTopology(this._topologyCacheKind, this._topologyHash, null, newTopology, this.conventions);

            this._updateNodeSelector(newTopology, parameters.forceUpdate);

            this._onTopologyUpdatedInvoke(newTopology, parameters.debugTag);

            return true;
        } catch (reason) {
            if (reason.name === "TimeoutError") {
                return false;
            }

            throw reason;
        } finally {
            acquiredSemContext.dispose();
        }
    }

    protected _updateClientConfigurationAsync(serverNode: ServerNode): Promise<void> {
        return Promise.resolve();
    }

    protected _throwExceptions(details: string): void {
        throwError("InvalidOperationException",
            "Failed to retrieve cluster topology from all known nodes" + EOL + details);
    }

    public dispose(): void {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this._clusterTopologySemaphore.take(() => {
            // empty
        });
        super.dispose();
    }
}
