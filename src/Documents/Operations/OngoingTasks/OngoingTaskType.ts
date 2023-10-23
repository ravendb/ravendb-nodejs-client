
export type OngoingTaskType =
    "Replication"
    | "RavenEtl"
    | "SqlEtl"
    | "OlapEtl"
    | "ElasticSearchEtl"
    | "QueueEtl"
    | "Backup"
    | "Subscription"
    | "PullReplicationAsHub"
    | "PullReplicationAsSink";
