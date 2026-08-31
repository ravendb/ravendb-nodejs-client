import { ConnectionString, ConnectionStringType } from "../../../Documents/Operations/Etl/ConnectionString.js";

/**
 * The kind of task or agent that references a connection string.
 */
export type ConnectionStringUsageKind =
    "RavenEtl"
    | "SqlEtl"
    | "OlapEtl"
    | "ElasticSearchEtl"
    | "QueueEtl"
    | "SnowflakeEtl"
    | "QueueSink"
    | "ExternalReplication"
    | "PullReplicationAsSink"
    | "EmbeddingsGeneration"
    | "GenAi"
    | "AiAgent"
    | "CdcSink";

/**
 * A usage of a server-wide connection string: a task or AI agent that currently references it,
 * together with the database it lives in.
 */
export interface ServerWideConnectionStringUsage {
    kind: ConnectionStringUsageKind;

    /**
     * The numeric task id, for ongoing tasks (ETL, replication, sinks). Null for AI agents.
     */
    id?: number;

    /**
     * The string identifier, for AI agents. Null for ongoing tasks.
     */
    identifier?: string;

    name: string;

    /**
     * The database where the referencing task/agent lives, since server-wide usages
     * are aggregated across all databases.
     */
    databaseName: string;
}

/**
 * Represents a server-wide connection string that is automatically propagated to all databases in the cluster
 * (unless explicitly excluded). Wraps a standard connection string with additional server-wide configuration
 * such as excludedDatabases.
 */
export class ServerWideConnectionString {
    /**
     * The underlying connection string definition (e.g., RavenConnectionString, SqlConnectionString, etc.).
     */
    public connectionString: ConnectionString;

    /**
     * An optional list of database names that should not receive this server-wide connection string.
     * When null or empty, the connection string is propagated to all databases.
     */
    public excludedDatabases?: string[];

    /**
     * The list of usages (ETL, replication, sinks, AI agents) that currently reference this server-wide
     * connection string. Computed server-side when reading; any value provided by a client is ignored.
     */
    public usedBy: ServerWideConnectionStringUsage[] = [];

    /**
     * The name of the connection string, delegated from the underlying connectionString.
     */
    public get name(): string {
        return this.connectionString?.name;
    }

    /**
     * The type of the connection string (Raven, Sql, Olap, etc.), delegated from the underlying connectionString.
     */
    public get type(): ConnectionStringType {
        return this.connectionString?.type ?? "None";
    }
}
