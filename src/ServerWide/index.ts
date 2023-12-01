import { DatabaseTopology } from "./Operations";
import { SorterDefinition } from "../Documents/Queries/Sorting/SorterDefinition";
import { DeletionInProgressStatus } from "./DeletionInProgressStatus";
import { AutoIndexDefinition } from "../Documents/Indexes/AutoIndexDefinition";
import { ExpirationConfiguration } from "../Documents/Operations/Expiration/ExpirationConfiguration";
import { PeriodicBackupConfiguration } from "../Documents/Operations/Backups/PeriodicBackupConfiguration";
import { PullReplicationAsSink } from "../Documents/Operations/Replication/PullReplicationAsSink";
import { PullReplicationDefinition } from "../Documents/Operations/Replication/PullReplicationDefinition";
import { RavenEtlConfiguration } from "../Documents/Operations/Etl/RavenEtlConfiguration";
import { SqlEtlConfiguration } from "../Documents/Operations/Etl/Sql/SqlEtlConfiguration";
import { StudioConfiguration } from "../Documents/Operations/Configuration/StudioConfiguration";
import { IndexDefinition } from "../Documents/Indexes/IndexDefinition";
import { RevisionsConfiguration } from "../Documents/Operations/RevisionsConfiguration";
import { ExternalReplication } from "../Documents/Replication/ExternalReplication";
import {
    ElasticSearchConnectionString,
    OlapConnectionString, QueueConnectionString,
    RavenConnectionString,
    SqlConnectionString
} from "../Documents/Operations/Etl/ConnectionString";
import { ClientConfiguration } from "../Documents/Operations/Configuration/ClientConfiguration";
import { RefreshConfiguration } from "../Documents/Operations/Refresh/RefreshConfiguration";
import { RevisionsCollectionConfiguration } from "../Documents/Operations/RevisionsCollectionConfiguration";
import { DocumentsCompressionConfiguration } from "./DocumentsCompressionConfiguration";
import { TimeSeriesConfiguration } from "../Documents/Operations/TimeSeries/TimeSeriesConfiguration";
import { RollingIndexDeployment } from "../Documents/Indexes/RollingIndexDeployment";
import { RollingIndex } from "../Documents/Indexes/RollingIndex";
import { AnalyzerDefinition } from "../Documents/Indexes/Analysis/AnalyzerDefinition";
import { OlapEtlConfiguration } from "../Documents/Operations/Etl/Olap/OlapEtlConfiguration";
import { IntegrationConfigurations } from "./Operations/Integrations/PostgreSql/IntegrationConfigurations";
import { ElasticSearchEtlConfiguration } from "../Documents/Operations/Etl/ElasticSearch/ElasticSearchEtlConfiguration";
import { QueueEtlConfiguration } from "../Documents/Operations/Etl/Queue/QueueEtlConfiguration";

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
    ravenEtls?: RavenEtlConfiguration[];
    sqlEtls?: SqlEtlConfiguration[];
    elasticSearchEtls?: ElasticSearchEtlConfiguration[];
    olapEtls?: OlapEtlConfiguration[];
    queueEtls?: QueueEtlConfiguration[];
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
