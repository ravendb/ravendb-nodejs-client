import { DatabaseTopology } from "./Operations";
import {
    ClientConfiguration,
    ExternalReplication,
    IndexDefinition,
    RavenConnectionString,
    RevisionsConfiguration, SqlConnectionString
} from "..";
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
    topology?: DatabaseTopology;
    conflictSolverConfig?: ConflictSolver;
    sorters?: { [key: string]: SorterDefinition };
    indexes?: { [key: string]: IndexDefinition };
    autoIndexes?: { [key: string]: AutoIndexDefinition };
    settings?: { [key: string]: string };
    revisions?: RevisionsConfiguration;
    expiration?: ExpirationConfiguration;
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
}

export interface DatabaseRecordWithEtag extends DatabaseRecord {
    etag: number;
}
