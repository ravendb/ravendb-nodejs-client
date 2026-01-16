import { DatabaseTopology } from "./Operations/index.js";
import { SorterDefinition } from "../Documents/Queries/Sorting/SorterDefinition.js";
import { DeletionInProgressStatus } from "./DeletionInProgressStatus.js";
import { AutoIndexDefinition } from "../Documents/Indexes/AutoIndexDefinition.js";
import { ExpirationConfiguration } from "../Documents/Operations/Expiration/ExpirationConfiguration.js";
import { PeriodicBackupConfiguration } from "../Documents/Operations/Backups/PeriodicBackupConfiguration.js";
import { PullReplicationAsSink } from "../Documents/Operations/Replication/PullReplicationAsSink.js";
import { PullReplicationDefinition } from "../Documents/Operations/Replication/PullReplicationDefinition.js";
import { RavenEtlConfiguration } from "../Documents/Operations/Etl/RavenEtlConfiguration.js";
import { SqlEtlConfiguration } from "../Documents/Operations/Etl/Sql/SqlEtlConfiguration.js";
import { StudioConfiguration } from "../Documents/Operations/Configuration/StudioConfiguration.js";
import { IndexDefinition } from "../Documents/Indexes/IndexDefinition.js";
import { RevisionsConfiguration } from "../Documents/Operations/RevisionsConfiguration.js";
import { ExternalReplication } from "../Documents/Replication/ExternalReplication.js";
import {
    ElasticSearchConnectionString,
    OlapConnectionString, QueueConnectionString,
    RavenConnectionString,
    SqlConnectionString
} from "../Documents/Operations/Etl/ConnectionString.js";
import { ClientConfiguration } from "../Documents/Operations/Configuration/ClientConfiguration.js";
import { RefreshConfiguration } from "../Documents/Operations/Refresh/RefreshConfiguration.js";
import { RevisionsCollectionConfiguration } from "../Documents/Operations/RevisionsCollectionConfiguration.js";
import { DocumentsCompressionConfiguration } from "./DocumentsCompressionConfiguration.js";
import { TimeSeriesConfiguration } from "../Documents/Operations/TimeSeries/TimeSeriesConfiguration.js";
import { RollingIndexDeployment } from "../Documents/Indexes/RollingIndexDeployment.js";
import { RollingIndex } from "../Documents/Indexes/RollingIndex.js";
import { AnalyzerDefinition } from "../Documents/Indexes/Analysis/AnalyzerDefinition.js";
import { OlapEtlConfiguration } from "../Documents/Operations/Etl/Olap/OlapEtlConfiguration.js";
import { IntegrationConfigurations } from "./Operations/Integrations/PostgreSql/IntegrationConfigurations.js";
import { ElasticSearchEtlConfiguration } from "../Documents/Operations/Etl/ElasticSearch/ElasticSearchEtlConfiguration.js";
import { QueueEtlConfiguration } from "../Documents/Operations/Etl/Queue/QueueEtlConfiguration.js";
import { DataArchivalConfiguration } from "../Documents/Operations/DataArchival/DataArchivalConfiguration.js";
import { QueueSinkConfiguration } from "../Documents/Operations/QueueSink/QueueSinkConfiguration.js";
import { ShardingConfiguration } from "./Sharding/ShardingConfiguration.js";
import {
    AiConnectionString,
    EmbeddingsGenerationConfiguration,
    GenAiConfiguration
} from "../Documents/Operations/AI/index.js";
import { AiAgentConfiguration } from "../Documents/Operations/AI/Agents/config/AiAgentConfiguration.js";

export interface ScriptResolver {
    script: string;
    lastModifiedTime: Date;
}

export interface ConflictSolver {
    resolveByCollection: { [key: string]: ScriptResolver };
    resolveToLatest: boolean;
}

export interface DatabaseRecord {
    databaseName: string;
    disabled?: boolean;
    encrypted?: boolean;
    etagForBackup?: number;
    deletionInProgress?: { [key: string]: DeletionInProgressStatus };
    rollingIndexes?: { [key: string]: RollingIndex };
    databaseState?: DatabaseStateStatus;
    lockMode?: DatabaseLockMode;
    topology?: DatabaseTopology;
    sharding?: ShardingConfiguration;
    conflictSolverConfig?: ConflictSolver;
    documentsCompression?: DocumentsCompressionConfiguration;
    sorters?: { [key: string]: SorterDefinition };
    analyzers?: { [key: string]: AnalyzerDefinition };
    indexes?: { [key: string]: IndexDefinition };
    indexesHistory?: { [key: string]: IndexHistoryEntry[] };
    autoIndexes?: { [key: string]: AutoIndexDefinition };
    settings?: { [key: string]: string };
    revisions?: RevisionsConfiguration;
    timeSeries?: TimeSeriesConfiguration;
    revisionsForConflicts?: RevisionsCollectionConfiguration;
    expiration?: ExpirationConfiguration;
    refresh?: RefreshConfiguration;
    dataArchival?: DataArchivalConfiguration;
    integrations?: IntegrationConfigurations;
    periodicBackups?: PeriodicBackupConfiguration[];
    externalReplications?: ExternalReplication[];
    sinkPullReplications?: PullReplicationAsSink[];
    hubPullReplications?: PullReplicationDefinition[];
    ravenConnectionStrings?: { [key: string]: RavenConnectionString };
    sqlConnectionStrings?: { [key: string]: SqlConnectionString };
    olapConnectionStrings?: { [key: string]: OlapConnectionString };
    elasticSearchConnectionStrings?: { [key: string]: ElasticSearchConnectionString };
    queueConnectionStrings?: { [key: string]: QueueConnectionString };
    aiConnectionStrings?: { [key: string]: AiConnectionString };
    ravenEtls?: RavenEtlConfiguration[];
    sqlEtls?: SqlEtlConfiguration[];
    elasticSearchEtls?: ElasticSearchEtlConfiguration[];
    olapEtls?: OlapEtlConfiguration[];
    queueEtls?: QueueEtlConfiguration[];
    queueSinks?: QueueSinkConfiguration[];
    aiAgents?: AiAgentConfiguration[];
    genAis?: GenAiConfiguration[];
    embeddingsGenerations?: EmbeddingsGenerationConfiguration[];
    client?: ClientConfiguration;
    studio?: StudioConfiguration;
    truncatedClusterTransactionIndex?: number;
    unusedDatabaseIds?: string[];
}

export interface IndexHistoryEntry {
    definition: IndexDefinition;
    source: string;
    createdAt: Date;
    rollingDeployment: Record<string, RollingIndexDeployment>;
}

export interface DatabaseRecordWithEtag extends DatabaseRecord {
    etag: number;
}

export type DatabaseStateStatus =
    "Normal"
    | "RestoreInProgress";

export type DatabaseLockMode =
    "Unlock"
    | "PreventDeletesIgnore"
    | "PreventDeletesError";
