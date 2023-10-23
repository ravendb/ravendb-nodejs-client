import { GetClusterTopologyCommand } from "../ServerWide/Commands/GetClusterTopologyCommand";
import { NodeSelector } from "./NodeSelector";
import * as os from "os";
import * as BluebirdPromise from "bluebird";
import * as semaphore from "semaphore";
import { getLogger } from "../Utility/LogUtil";
import { RequestExecutor, IRequestExecutorOptions } from "./RequestExecutor";
import { throwError } from "../Exceptions";
import { ServerNode } from "./ServerNode";
import { Topology } from "./Topology";
import { GetTcpInfoCommand } from "../ServerWide/Commands/GetTcpInfoCommand";
import { IAuthOptions } from "../Auth/AuthOptions";
import { acquireSemaphore } from "../Utility/SemaphoreUtil";
import { DocumentConventions } from "../Documents/Conventions/DocumentConventions";
import { UpdateTopologyParameters } from "./UpdateTopologyParameters";
import { CONSTANTS, HEADERS } from "../Constants";

const log = getLogger({ module: "ClusterRequestExecutor" });

export class ClusterRequestExecutor extends RequestExecutor {

    private _clusterTopologySemaphore = semaphore();

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
        url: string, opts: IRequestExecutorOptions): ClusterRequestExecutor;
    public static createForSingleNode(
        url: string, opts: IRequestExecutorOptions): ClusterRequestExecutor;
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
            documentConventions ? documentConventions : DocumentConventions.defaultConventions);

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

    public updateTopology(parameters: UpdateTopologyParameters): Promise<boolean> {
        if (this._disposed) {
            return Promise.resolve(false);
        }

        const acquiredSemContext = acquireSemaphore(this._clusterTopologySemaphore, { timeout: parameters.timeoutInMs });
        const result = BluebirdPromise.resolve(acquiredSemContext.promise)
            .then(() => {
                if (this._disposed) {
                    return false;
                }

                const command = new GetClusterTopologyCommand(parameters.debugTag);
                return this.execute(command, null, {
                    chosenNode: parameters.node,
                    nodeIndex: null,
                    shouldRetry: false
                })
                    .then(() => {
                        const results = command.result;
                        const nodes = ServerNode.createFrom(results.topology);

                        const newTopology = new Topology(results.etag, nodes);

                        this._updateNodeSelector(newTopology, parameters.forceUpdate);

                        this._onTopologyUpdatedInvoke(newTopology);
                    })
                    .then(() => true);

            }, (reason: Error) => {
                if (reason.name === "TimeoutError") {
                    return false;
                }

                throw reason;
            })
            .finally(() => acquiredSemContext.dispose());

        return Promise.resolve(result);
    }

    protected _updateClientConfigurationAsync(serverNode: ServerNode): Promise<void> {
        return Promise.resolve();
    }

    protected _throwExceptions(details: string): void {
        throwError("InvalidOperationException",
            "Failed to retrieve cluster topology from all known nodes" + os.EOL + details);
    }

    public dispose(): void {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this._clusterTopologySemaphore.take(() => {
        });
        super.dispose();
    }
}
