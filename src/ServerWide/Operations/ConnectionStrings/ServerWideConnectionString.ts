import { ConnectionString, ConnectionStringType } from "../../../Documents/Operations/Etl/ConnectionString.js";

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
