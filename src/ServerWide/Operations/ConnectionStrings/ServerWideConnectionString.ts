import { ConnectionString, ConnectionStringType } from "../../../Documents/Operations/Etl/ConnectionString.js";

export class ServerWideConnectionString {
    public connectionString: ConnectionString;
    public excludedDatabases?: string[];

    get name(): string {
        return this.connectionString?.name;
    }

    get type(): ConnectionStringType {
        return this.connectionString?.type ?? "None";
    }
}
