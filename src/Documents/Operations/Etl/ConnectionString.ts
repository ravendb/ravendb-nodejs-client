import { LocalSettings } from "../Backups/LocalSettings";
import { S3Settings } from "../Backups/S3Settings";
import { AzureSettings } from "../Backups/AzureSettings";
import { GlacierSettings } from "../Backups/GlacierSettings";
import { GoogleCloudSettings } from "../Backups/GoogleCloudSettings";
import { FtpSettings } from "../Backups/FtpSettings";

export type ConnectionStringType =
    "None"
    | "Raven"
    | "Sql"
    | "Olap";

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

export class OlapConnectionString extends ConnectionString {
    public localSettings: LocalSettings;
    public s3Settings: S3Settings;
    public azureSettings: AzureSettings;
    public glacierSettings: GlacierSettings;
    public googleCloudSettings: GoogleCloudSettings;
    public ftpSettings: FtpSettings;

    public type: ConnectionStringType = "Olap";
}


export type EtlType =
    "Raven"
    | "Sql"
    | "Olap";