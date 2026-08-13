import { NodeSelector } from "../../../src/Http/NodeSelector.js";
import { NodeStatus, RequestExecutor } from "../../../src/Http/RequestExecutor.js";
import { ServerNode } from "../../../src/Http/ServerNode.js";
import { Topology } from "../../../src/Http/Topology.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RDBC_1100", function () {

    function createNode(clusterTag: string): ServerNode {
        return new ServerNode({
            url: "http://" + clusterTag.toLowerCase() + ".example.com",
            database: "db",
            clusterTag,
            serverRole: "Member"
        });
    }

    function createExecutorStub(node: ServerNode, healthCheckError?: Error) {
        const executor = Object.create(RequestExecutor.prototype) as RequestExecutor;

        const failedNodesTimers = new Map<ServerNode, NodeStatus>();
        (executor as any)._failedNodesTimers = failedNodesTimers;
        (executor as any)._nodeSelector = new NodeSelector(new Topology(1, [node]));
        (executor as any)._log = { error: () => {}, warn: () => {}, info: () => {} };
        (executor as any)._performHealthCheck = async () => {
            if (healthCheckError) {
                throw healthCheckError;
            }
        };

        const timerCalls = { disposed: false, changed: false };
        const nodeStatus = new NodeStatus(node, executor, () => Promise.resolve());
        (nodeStatus as any)._timer = {
            dispose: () => timerCalls.disposed = true,
            change: () => timerCalls.changed = true
        };
        failedNodesTimers.set(node, nodeStatus);

        return { executor, failedNodesTimers, nodeStatus, timerCalls };
    }

    it("recovered node is removed from failed nodes timers, so future health checks can spawn", async () => {
        const node = createNode("A");
        const { executor, failedNodesTimers, nodeStatus, timerCalls } = createExecutorStub(node);

        await (executor as any)._checkNodeStatusCallback(nodeStatus);

        assertThat(failedNodesTimers.has(node))
            .isFalse();
        assertThat(failedNodesTimers.size)
            .isEqualTo(0);
        assertThat(timerCalls.disposed)
            .isTrue();
    });

    it("still-down node stays in failed nodes timers and its timer is rescheduled", async () => {
        const node = createNode("A");
        const { executor, failedNodesTimers, nodeStatus, timerCalls } =
            createExecutorStub(node, new Error("Node is still down"));

        await (executor as any)._checkNodeStatusCallback(nodeStatus);

        assertThat(failedNodesTimers.has(node))
            .isTrue();
        assertThat(timerCalls.changed)
            .isTrue();
        assertThat(timerCalls.disposed)
            .isFalse();
    });
});
