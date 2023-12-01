import { LocalSettings } from "../Backups/LocalSettings";
import { S3Settings } from "../Backups/S3Settings";
import { AzureSettings } from "../Backups/AzureSettings";
import { GlacierSettings } from "../Backups/GlacierSettings";
import { GoogleCloudSettings } from "../Backups/GoogleCloudSettings";
import { FtpSettings } from "../Backups/FtpSettings";
import { KafkaConnectionSettings } from "./Queue/KafkaConnectionSettings";
import { RabbitMqConnectionSettings } from "./Queue/RabbitMqConnectionSettings";

export type ConnectionStringType =
    "None"
    | "Raven"
    | "Sql"
    | "Olap"
    | "ElasticSearch"
    | "Queue";

export type QueueBrokerType =
    "None"
    | "Kafka"
    | "RabbitMq";

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

export class ElasticSearchConnectionString extends ConnectionString {
    public nodes: string[];
    public authentication?: Authentication;
    public enableCompatibilityMode?: boolean;

    public type: ConnectionStringType = "ElasticSearch";
}

export class Authentication {
    public apiKey: ApiKeyAuthentication;
    public basic: BasicAuthentication;
    public certificate: CertificateAuthentication;
}

export interface ApiKeyAuthentication {
    apiKeyId: string;
    apiKey: string;
}

export interface BasicAuthentication {
    username: string;
    password: string;
}

export interface CertificateAuthentication {
    certificatesBase64: string[];
}

export class QueueConnectionString extends ConnectionString {
    public brokerType: QueueBrokerType;
    public kafkaConnectionSettings: KafkaConnectionSettings;
    public rabbitMqConnectionSettings: RabbitMqConnectionSettings;

    public type: ConnectionStringType = "Queue";
}


export type EtlType =
    "Raven"
    | "Sql"
    | "Olap"
    | "ElasticSearch"
    | "Queue";
