import { CdcSinkPostgresSettings } from "./CdcSinkPostgresSettings.js";
import { CdcSinkTableConfig } from "./CdcSinkTableConfig.js";

/**
 * Configuration of a CDC Sink task: captures change-data-capture events from a
 * relational source database (SQL Server, PostgreSQL) and syncs them into RavenDB documents.
 */
export interface CdcSinkConfiguration {
    taskId?: number;
    disabled?: boolean;
    name: string;
    mentorNode?: string;
    pinToMentorNode?: boolean;
    connectionStringName: string;

    /**
     * The source tables to capture, each mapped to a RavenDB collection.
     */
    tables: CdcSinkTableConfig[];

    /**
     * PostgreSQL-specific settings (publication name, slot name).
     * Null for SQL Server configurations. Auto-filled on creation if omitted.
     */
    postgres?: CdcSinkPostgresSettings;

    /**
     * When true, the initial full-table load is skipped - tables are marked as
     * loaded immediately and the task starts streaming CDC changes. Use this when
     * the target RavenDB database is already populated (e.g., from a prior migration).
     */
    skipInitialLoad?: boolean;
}
