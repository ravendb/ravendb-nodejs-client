import { ReplicationBatchOptions, IndexBatchOptions } from "../../Session/IAdvancedSessionOperations.js";
import { ShardedBatchOptions } from "./ShardedBatchOptions.js";

export interface BatchOptions {
    replicationOptions?: ReplicationBatchOptions;
    indexOptions?: IndexBatchOptions;
    shardedOptions?: ShardedBatchOptions;
    requestTimeout?: number;
}
