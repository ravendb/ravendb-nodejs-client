import { ReplicationBatchOptions, IndexBatchOptions } from "../../Session/IAdvancedSessionOperations";

export interface BatchOptions {
    replicationOptions: ReplicationBatchOptions;
    indexOptions: IndexBatchOptions;
}
