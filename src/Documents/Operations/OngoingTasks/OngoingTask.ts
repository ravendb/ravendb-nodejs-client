import { NodeId } from "../../Subscriptions/NodeId.js";
import { RunningBackup } from "./RunningBackup.js";
import { NextBackup } from "./NextBackup.js";
import { OngoingTaskType } from "./OngoingTaskType.js";
import { BackupType } from "../Backups/Enums.js";
import { RavenEtlConfiguration } from "../Etl/RavenEtlConfiguration.js";
import { SqlEtlConfiguration } from "../Etl/Sql/SqlEtlConfiguration.js";
import { SnowflakeEtlConfiguration } from "../Etl/Snowflake/SnowflakeEtlConfiguration.js";
import { RetentionPolicy } from "../Backups/RetentionPolicy.js";
import { ElasticSearchEtlConfiguration } from "../Etl/ElasticSearch/ElasticSearchEtlConfiguration.js";
import { OlapEtlConfiguration } from "../Etl/Olap/OlapEtlConfiguration.js";
import { QueueEtlConfiguration } from "../Etl/Queue/QueueEtlConfiguration.js";
import { ArchivedDataProcessingBehavior } from "../../DataArchival/ArchivedDataProcessingBehavior.js";
import { QueueBrokerType } from "../Etl/ConnectionString.js";
import { QueueSinkConfiguration } from "../QueueSink/QueueSinkConfiguration.js";
import { CdcSinkConfiguration } from "../CdcSink/CdcSinkConfiguration.js";

export interface OngoingTask {
    taskId: number;
    taskType: OngoingTaskType;
    responsibleNode: NodeId;
    taskState: OngoingTaskState;
    taskConnectionStatus: OngoingTaskConnectionStatus;
    taskName: string;
    error: string;
    mentorNode: string;
}

export interface OngoingTaskBackup extends OngoingTask {
    taskType: "Backup",
    backupType: BackupType;
    backupDestinations: string[];
    lastFullBackup: Date;
    lastIncrementalBackup: Date;
    onGoingBackup: RunningBackup;
    nextBackup: NextBackup;
    retentionPolicy: RetentionPolicy;
    isEncrypted: boolean;
    lastExecutingNodeTag: string;
}

export type OngoingTaskConnectionStatus =
    "None"
    | "Active"
    | "NotActive"
    | "Reconnect"
    | "NotOnThisNode";


export interface OngoingTaskRavenEtl extends OngoingTask {
    taskType: "RavenEtl",
    destinationUrl: string;
    destinationDatabase: string;
    connectionStringName: string;
    topologyDiscoveryUrls: string[];
    configuration: RavenEtlConfiguration;
}


export interface OngoingTaskReplication extends OngoingTask {
    taskType: "Replication",
    destinationUrl: string;
    topologyDiscoveryUrls: string[];
    destinationDatabase: string;
    connectionStringName: string;
    delayReplicationFor: string;
}

export interface OngoingTaskElasticSearchEtl extends OngoingTask {
    taskType: "ElasticSearchEtl",
    connectionStringName: string;
    nodesUrls: string[];
    configuration: ElasticSearchEtlConfiguration;
}

export interface OngoingTaskQueueSink extends OngoingTask {
    taskType: "QueueSink",
    brokerType: QueueBrokerType;
    connectionStringName: string;
    url: string;
    configuration: QueueSinkConfiguration;
}

export interface OngoingTaskCdcSink extends OngoingTask {
    taskType: "CdcSink",
    connectionStringName: string;
    factoryName: string;
    configuration: CdcSinkConfiguration;

    /**
     * UTC time of the last successfully completed batch. Null if no batch has completed yet.
     */
    lastBatchTime: Date;

    /**
     * The last successfully persisted checkpoint (LSN/GTID).
     */
    lastCheckpoint: string;

    /**
     * Seconds since the last successful batch. Null if no batch has completed yet.
     * Provides a simple lag indicator for the dashboard.
     */
    secondsSinceLastBatch: number;

    /**
     * UTC time of the last activity from the source - poll iteration (SQL Server),
     * replication message (PostgreSQL), or binlog event (MySQL).
     * Null before the first activity. When this is recent but lastBatchTime is old,
     * it means the source connection is alive but there are no changes. When both
     * are stale, the connection may be dead.
     */
    lastActivityTime: Date;

    /**
     * Seconds since the last source activity. When this exceeds the expected
     * heartbeat/poll interval significantly, the connection may be dead.
     */
    secondsSinceLastActivity: number;

    /**
     * Null when healthy. Contains a diagnostic message when the process
     * detects a problem (fallback mode, stale connection, etc.).
     */
    healthIssue: string;
}

export interface OngoingTaskSqlEtl extends OngoingTask {
    taskType: "SqlEtl",
    destinationServer: string;
    destinationDatabase: string;
    connectionStringName: string;
    connectionStringDefined: boolean;
    configuration: SqlEtlConfiguration;
}

export interface OngoingTaskSnowflakeEtl extends OngoingTask {
    taskType: "SnowflakeEtl",
    connectionStringName: string;
    connectionString: string;
    configuration: SnowflakeEtlConfiguration;
}

export type OngoingTaskState =
    "None"
    | "Enabled"
    | "Disabled"
    | "PartiallyEnabled";

export interface OngoingTaskSubscription extends OngoingTask {
    taskType: "Subscription",
    query: string;
    subscriptionName: string;
    subscriptionId: number;
    changeVectorForNextBatchStartingPoint: string;
    changeVectorForNextBatchStartingPointPerShard: Record<string, string>;
    archivedDataProcessingBehavior: ArchivedDataProcessingBehavior;
    lastBatchAckTime: Date;
    disabled: boolean;
    lastClientConnectionTime: Date;
}

export interface OngoingTaskOlapEtl extends OngoingTask {
    taskType: "OlapEtl",
    connectionStringName: string;
    destination: string;
    configuration: OlapEtlConfiguration;
}


export interface OngoingTaskQueueEtl extends OngoingTask {
    brokerType: QueueBrokerType;
    connectionStringName: string;
    url: string;
    configuration: QueueEtlConfiguration;
}
