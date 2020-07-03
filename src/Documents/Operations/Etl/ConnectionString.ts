export type ConnectionStringType =
    "None" |
    "Raven" |
    "Sql";

export abstract class ConnectionString {
    public name: string;
    public abstract type: ConnectionStringType;
}

export class RavenConnectionString extends ConnectionString {
    public database: string;
    public topologyDiscoveryUrls: string[];
    public type: ConnectionStringType = "Raven";
}

export class SqlConnectionString extends ConnectionString {
    public connectionString: string;
    public factoryName: string;
    public type: ConnectionStringType = "Sql";
}

export type EtlType =
    "Raven"
    | "Sql";