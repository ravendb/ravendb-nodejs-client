import {IAuthOptions} from '../Auth/AuthOptions';
import * as _ from "lodash";
import * as os from "os";
import * as BluebirdPromise from "bluebird";
import * as semaphore from "semaphore";
import { getLogger } from "../Utility/LogUtil";
import {RequestExecutor} from "./RequestExecutor";
import { DocumentConventions } from "..";
import { throwError } from "../Exceptions";

const log = getLogger({ module: "ClusterRequestExecutor" });

export class ClusterRequestExecutor extends RequestExecutor {

    private clusterTopologySemaphore = semaphore();

    protected constructor(authOptions: IAuthOptions, conventions: DocumentConventions) {
        super(null, authOptions, conventions);
    }

    public static create(
        urls: string[], 
        databaseName: string, 
        authOptions: IAuthOptions, 
        conventions: DocumentConventions): ClusterRequestExecutor {
            throwError("", "NotSupportedException");
    }

    @SuppressWarnings("unused")
    public static ClusterRequestExecutor createForSingleNodeWithConfigurationUpdates(String url, String databaseName, KeyStore certificate, DocumentConventions conventions) {
        throw new UnsupportedOperationException();
    }

    @SuppressWarnings("unused")
    public static ClusterRequestExecutor createForSingleNodeWithoutConfigurationUpdates(String url, String databaseName, KeyStore certificate, DocumentConventions conventions) {
        throw new UnsupportedOperationException();
    }

    public static ClusterRequestExecutor createForSingleNode(String url, KeyStore certificate) {
        return createForSingleNode(url, certificate, null);
    }

    public static ClusterRequestExecutor createForSingleNode(String url, KeyStore certificate, DocumentConventions conventions) {
        String[] initialUrls = {url};
        url = validateUrls(initialUrls, certificate)[0];

        ClusterRequestExecutor executor = new ClusterRequestExecutor(certificate, ObjectUtils.firstNonNull(conventions, DocumentConventions.defaultConventions), initialUrls);

        ServerNode serverNode = new ServerNode();
        serverNode.setUrl(url);

        Topology topology = new Topology();
        topology.setEtag(-1L);
        topology.setNodes(Collections.singletonList(serverNode));

        NodeSelector nodeSelector = new NodeSelector(topology);

        executor._nodeSelector = nodeSelector;
        executor.topologyEtag = -2L;
        executor._disableClientConfigurationUpdates = true;
        executor._disableTopologyUpdates = true;

        return executor;
    }

    public static ClusterRequestExecutor create(String[] initialUrls, KeyStore certificate) {
        return create(initialUrls, certificate, null);
    }

    public static ClusterRequestExecutor create(String[] initialUrls, KeyStore certificate, DocumentConventions conventions) {
        ClusterRequestExecutor executor = new ClusterRequestExecutor(certificate, conventions != null ? conventions : DocumentConventions.defaultConventions, initialUrls);

        executor._disableClientConfigurationUpdates = true;
        executor._firstTopologyUpdate = executor.firstTopologyUpdate(initialUrls);
        return executor;
    }

    @Override
    protected void performHealthCheck(ServerNode serverNode, int nodeIndex) {
        execute(serverNode, nodeIndex, new GetTcpInfoCommand("health-check"), false, null);
    }

    @Override
    public CompletableFuture<Boolean> updateTopologyAsync(ServerNode node, int timeout, boolean forceUpdate) {
        if (_disposed) {
            return CompletableFuture.completedFuture(false);
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                boolean lockTaken = clusterTopologySemaphore.tryAcquire(timeout, TimeUnit.MILLISECONDS);
                if (!lockTaken) {
                    return false;
                }
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }

            try {
                if (_disposed) {
                    return false;
                }

                GetClusterTopologyCommand command = new GetClusterTopologyCommand();
                execute(node, null, command, false, null);

                ClusterTopologyResponse results = command.getResult();
                List<ServerNode> nodes = results
                        .getTopology()
                        .getMembers()
                        .entrySet()
                        .stream()
                        .map(kvp -> {
                            ServerNode serverNode = new ServerNode();
                            serverNode.setUrl(kvp.getValue());
                            serverNode.setClusterTag(kvp.getKey());
                            return serverNode;
                        })
                        .collect(Collectors.toList());

                Topology newTopology = new Topology();
                newTopology.setNodes(nodes);

                if (_nodeSelector == null) {
                    _nodeSelector = new NodeSelector(newTopology);

                    if (_readBalanceBehavior == ReadBalanceBehavior.FASTEST_NODE) {
                        _nodeSelector.scheduleSpeedTest();
                    }
                } else if (_nodeSelector.onUpdateTopology(newTopology, forceUpdate)) {
                    disposeAllFailedNodesTimers();

                    if (_readBalanceBehavior == ReadBalanceBehavior.FASTEST_NODE) {
                        _nodeSelector.scheduleSpeedTest();
                    }
                }
            } finally {
                clusterTopologySemaphore.release();
            }

            return true;
        });
    }

    @Override
    protected CompletableFuture<Void> updateClientConfigurationAsync() {
        return CompletableFuture.completedFuture(null);
    }

    protected void throwExceptions(String details) {
        throw new IllegalStateException("Failed to retrieve cluster topology from all known nodes" + System.lineSeparator() + details);
    }

    @Override
    public void close() {
        try {
            clusterTopologySemaphore.acquire();
        } catch (InterruptedException ignored) {
        }

        super.close();
    }
}
