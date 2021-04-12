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
import { RavenConnectionString, SqlConnectionString } from "../Documents/Operations/Etl/ConnectionString";
import { ClientConfiguration } from "../Documents/Operations/Configuration/ClientConfiguration";
import { RefreshConfiguration } from "../Documents/Operations/Refresh/RefreshConfiguration";
import { RevisionsCollectionConfiguration } from "../Documents/Operations/RevisionsCollectionConfiguration";

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
    databaseState?: DatabaseStateStatus;
    topology?: DatabaseTopology;
    conflictSolverConfig?: ConflictSolver;
    sorters?: { [key: string]: SorterDefinition };
    indexes?: { [key: string]: IndexDefinition };
    indexesHistory?: { [key: string]: IndexHistoryEntry[] };
    autoIndexes?: { [key: string]: AutoIndexDefinition };
    settings?: { [key: string]: string };
    revisions?: RevisionsConfiguration;
    revisionsForConflicts?: RevisionsCollectionConfiguration;
    expiration?: ExpirationConfiguration;
    refresh?: RefreshConfiguration;
    periodicBackups?: PeriodicBackupConfiguration[];
    externalReplications?: ExternalReplication[];
    sinkPullReplications?: PullReplicationAsSink[];
    hubPullReplications?: PullReplicationDefinition[];
    ravenConnectionStrings?: { [key: string]: RavenConnectionString };
    sqlConnectionStrings?: { [key: string]: SqlConnectionString };
    ravenEtls?: RavenEtlConfiguration[];
    sqlEtls?: SqlEtlConfiguration[];
    client?: ClientConfiguration;
    studio?: StudioConfiguration;
    truncatedClusterTransactionIndex?: number;
    unusedDatabaseIds?: string[];
}

export interface IndexHistoryEntry {
    definition: IndexDefinition;
    source: string;
    createdAt: Date;
}

export interface DatabaseRecordWithEtag extends DatabaseRecord {
    etag: number;
}

export type DatabaseStateStatus =
    "Normal"
    | "RestoreInProgress";