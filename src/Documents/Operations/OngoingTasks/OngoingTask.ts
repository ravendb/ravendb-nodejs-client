import { NodeId } from "../../Subscriptions/NodeId";
import { RunningBackup } from "./RunningBackup";
import { NextBackup } from "./NextBackup";
import { OngoingTaskType } from "./OngoingTaskType";
import { BackupType } from "../Backups/Enums";
import { RavenEtlConfiguration } from "../Etl/RavenEtlConfiguration";
import { SqlEtlConfiguration } from "../Etl/Sql/SqlEtlConfiguration";
import { RetentionPolicy } from "../Backups/RetentionPolicy";
import { ElasticSearchEtlConfiguration } from "../Etl/ElasticSearch/ElasticSearchEtlConfiguration";
import { OlapEtlConfiguration } from "../Etl/Olap/OlapEtlConfiguration";
import { QueueEtlConfiguration } from "../Etl/Queue/QueueEtlConfiguration";

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

export interface OngoingTaskRavenEtlDetails extends OngoingTask {
    taskType: "RavenEtl",
    destinationUrl: string;
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

export interface OngoingTaskSqlEtlDetails extends OngoingTask {
    taskType: "SqlEtl",
    configuration: SqlEtlConfiguration;
}

export type OngoingTaskState =
    "Enabled"
    | "Disabled"
    | "PartiallyEnabled";

export interface OngoingTaskSubscription extends OngoingTask {
    taskType: "Subscription",
    query: string;
    subscriptionName: string;
    subscriptionId: number;
    changeVectorForNextBatchStartingPoint: string;
    lastBatchAckTime: Date;
    disabled: boolean;
    lastClientConnectionTime: Date;
}

export interface OngoingTaskElasticSearchEtlDetails extends OngoingTask {
    taskType: "ElasticSearchEtl",
    configuration: ElasticSearchEtlConfiguration;
}

export interface OngoingTaskOlapEtlDetails extends OngoingTask {
    taskType: "OlapEtl",
    configuration: OlapEtlConfiguration;
}

export interface OngoingTaskQueueEtlDetails extends OngoingTask {
    configuration: QueueEtlConfiguration;
}
