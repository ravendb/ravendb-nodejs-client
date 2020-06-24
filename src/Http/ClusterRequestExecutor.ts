import { GetClusterTopologyCommand } from "../ServerWide/Commands/GetClusterTopologyCommand";
import { NodeSelector } from "./NodeSelector";
import * as os from "os";
import * as BluebirdPromise from "bluebird";
import * as semaphore from "semaphore";
import { getLogger } from "../Utility/LogUtil";
import { RequestExecutor, IRequestExecutorOptions } from "./RequestExecutor";
import { DocumentConventions } from "..";
import { throwError } from "../Exceptions";
import { ServerNode } from "./ServerNode";
import { Topology } from "./Topology";
import { GetTcpInfoCommand } from "../ServerWide/Commands/GetTcpInfoCommand";
import { IAuthOptions } from "../Auth/AuthOptions";
import { acquireSemaphore } from "../Utility/SemaphoreUtil";

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
        const urls = this._validateUrls(initialUrls, authOptions);

        const executor = new ClusterRequestExecutor(
            authOptions, documentConventions || DocumentConventions.defaultConventions);

        const serverNode = new ServerNode({ url });

        const topology = new Topology(-1, [serverNode]);

        const nodeSelector = new NodeSelector(topology);

        executor._nodeSelector = nodeSelector;
        executor._topologyEtag = -2;
        executor._disableClientConfigurationUpdates = true;
        executor._disableTopologyUpdates = true;

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
        executor._firstTopologyUpdatePromise = executor._firstTopologyUpdate(initialUrls);
        return executor;
    }

    protected _performHealthCheck(serverNode: ServerNode, nodeIndex: number): Promise<void> {
        return this.execute(new GetTcpInfoCommand("health-check"), null, {
            chosenNode: serverNode,
            nodeIndex,
            shouldRetry: false
        });
    }

    public updateTopology(node: ServerNode, timeout: number, forceUpdate: boolean = false, debugTag?: string): Promise<boolean> {
        if (this._disposed) {
            return Promise.resolve(false);
        }

        const acquiredSemContext = acquireSemaphore(this._clusterTopologySemaphore, { timeout });
        const result = BluebirdPromise.resolve(acquiredSemContext.promise)
            .then(() => {
                if (this._disposed) {
                    return false;
                }

                const command = new GetClusterTopologyCommand(debugTag);
                return this.execute(command, null, {
                    chosenNode: node,
                    nodeIndex: null,
                    shouldRetry: false
                })
                    .then(() => {
                        const results = command.result;
                        const members = results.topology.members;
                        const nodes = Object.keys(members)
                            .reduce((reduceResult, clusterTag) => {
                                const url = members[clusterTag];
                                const serverNode = new ServerNode({ clusterTag, url });
                                return [...reduceResult, serverNode];
                            }, []);

                        const newTopology = new Topology(0, nodes);
                        if (!this._nodeSelector) {
                            this._nodeSelector = new NodeSelector(newTopology);

                            if (this._readBalanceBehavior === "FastestNode") {
                                this._nodeSelector.scheduleSpeedTest();
                            }

                        } else if (this._nodeSelector.onUpdateTopology(newTopology, forceUpdate)) {
                            this._disposeAllFailedNodesTimers();

                            if (this._readBalanceBehavior === "FastestNode") {
                                this._nodeSelector.scheduleSpeedTest();
                            }
                        }
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

    protected _updateClientConfigurationAsync(): Promise<void> {
        return Promise.resolve();
    }

    protected _throwExceptions(details: string): void {
        throwError("InvalidOperationException",
            "Failed to retrieve cluster topology from all known nodes" + os.EOL + details);
    }

    public dispose(): void {
        // tslint:disable-next-line:no-empty
        this._clusterTopologySemaphore.take(() => {
        });
        super.dispose();
    }
}
