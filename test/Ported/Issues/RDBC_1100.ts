import { NodeSelector } from "../../../src/Http/NodeSelector.js";
import { NodeStatus } from "../../../src/Http/RequestExecutor.js";
import { ServerNode } from "../../../src/Http/ServerNode.js";
import { Topology } from "../../../src/Http/Topology.js";
import { Timer } from "../../../src/Primitives/Timer.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import {
    createBareRequestExecutor,
    createNoopLogger,
    internals,
    nodeStatusInternals
} from "../../Utils/RequestExecutorInternals.js";

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
        const executor = createBareRequestExecutor();
        const executorInternals = internals(executor);

        const failedNodesTimers = new Map<ServerNode, NodeStatus>();
        executorInternals._failedNodesTimers = failedNodesTimers;
        executorInternals._nodeSelector = new NodeSelector(new Topology(1, [node]));
        executorInternals._log = createNoopLogger();
        executorInternals._performHealthCheck = async () => {
            if (healthCheckError) {
                throw healthCheckError;
            }
        };

        const timerCalls = { disposed: false, changed: false };
        const nodeStatus = new NodeStatus(node, executor, () => Promise.resolve());
        nodeStatusInternals(nodeStatus)._timer = {
            dispose: () => timerCalls.disposed = true,
            change: () => timerCalls.changed = true
        } as unknown as Timer;
        failedNodesTimers.set(node, nodeStatus);

        return { executorInternals, failedNodesTimers, nodeStatus, timerCalls };
    }

    it("recovered node is removed from failed nodes timers, so future health checks can spawn", async () => {
        const node = createNode("A");
        const { executorInternals, failedNodesTimers, nodeStatus, timerCalls } = createExecutorStub(node);

        await executorInternals._checkNodeStatusCallback(nodeStatus);

        assertThat(failedNodesTimers.has(node))
            .isFalse();
        assertThat(failedNodesTimers.size)
            .isEqualTo(0);
        assertThat(timerCalls.disposed)
            .isTrue();
    });

    it("still-down node stays in failed nodes timers and its timer is rescheduled", async () => {
        const node = createNode("A");
        const { executorInternals, failedNodesTimers, nodeStatus, timerCalls } =
            createExecutorStub(node, new Error("Node is still down"));

        await executorInternals._checkNodeStatusCallback(nodeStatus);

        assertThat(failedNodesTimers.has(node))
            .isTrue();
        assertThat(timerCalls.changed)
            .isTrue();
        assertThat(timerCalls.disposed)
            .isFalse();
    });
});
