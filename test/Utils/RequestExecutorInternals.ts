import { NodeSelector } from "../../src/Http/NodeSelector.js";
import { NodeStatus, RequestExecutor } from "../../src/Http/RequestExecutor.js";
import { ServerNode } from "../../src/Http/ServerNode.js";
import { ILogger } from "../../src/Utility/LogUtil.js";
import { Timer } from "../../src/Primitives/Timer.js";

export interface RequestExecutorInternals {
    _nodeSelector: NodeSelector;
    _failedNodesTimers: Map<ServerNode, NodeStatus>;
    _log: ILogger;
    _performHealthCheck(serverNode: ServerNode, nodeIndex: number): Promise<void>;
    _checkNodeStatusCallback(nodeStatus: NodeStatus): Promise<void>;
    _updateTopologyCallback(): Promise<void>;
}

export interface NodeStatusInternals {
    _timer: Timer;
}

export function internals(executor: RequestExecutor): RequestExecutorInternals {
    return executor as unknown as RequestExecutorInternals;
}

export function nodeStatusInternals(nodeStatus: NodeStatus): NodeStatusInternals {
    return nodeStatus as unknown as NodeStatusInternals;
}

/**
 * A RequestExecutor that skips the constructor, so tests can drive a single private
 * callback without spinning up connections, topology updates or timers.
 */
export function createBareRequestExecutor(): RequestExecutor {
    return Object.create(RequestExecutor.prototype) as RequestExecutor;
}

export function createNoopLogger(): ILogger {
    const noop = () => {
        // logging is irrelevant for these tests
    };

    return {
        error: noop,
        warn: noop,
        info: noop
    };
}
