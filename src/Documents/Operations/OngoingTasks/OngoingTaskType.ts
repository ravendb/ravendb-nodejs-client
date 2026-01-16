
export type OngoingTaskType =
    "Replication"
    | "RavenEtl"
    | "SqlEtl"
    | "OlapEtl"
    | "ElasticSearchEtl"
    | "QueueEtl"
    | "SnowflakeEtl"
    | "Backup"
    | "Subscription"
    | "PullReplicationAsHub"
    | "PullReplicationAsSink"
    | "QueueSink"
    | "EmbeddingsGeneration"
    | "GenAi";