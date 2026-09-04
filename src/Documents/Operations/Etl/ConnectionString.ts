import { LocalSettings } from "../Backups/LocalSettings.js";
import { S3Settings } from "../Backups/S3Settings.js";
import { AzureSettings } from "../Backups/AzureSettings.js";
import { GlacierSettings } from "../Backups/GlacierSettings.js";
import { GoogleCloudSettings } from "../Backups/GoogleCloudSettings.js";
import { FtpSettings } from "../Backups/FtpSettings.js";
import { KafkaConnectionSettings } from "./Queue/KafkaConnectionSettings.js";
import { RabbitMqConnectionSettings } from "./Queue/RabbitMqConnectionSettings.js";
import { AzureServiceBusConnectionSettings } from "./Queue/AzureServiceBusConnectionSettings.js";
import { AzureQueueStorageConnectionSettings } from "./Queue/AzureQueueStorageConnectionSettings.js";
import { AmazonSqsConnectionSettings } from "./Queue/AmazonSqsConnectionSettings.js";

export type ConnectionStringType =
    "None"
    | "Raven"
    | "Sql"
    | "Olap"
    | "ElasticSearch"
    | "Queue"
    | "Snowflake"
    | "Ai";

export type QueueBrokerType =
    "None"
    | "Kafka"
    | "RabbitMq"
    | "AzureQueueStorage"
    | "AmazonSqs"
    | "AzureServiceBus";

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

export class SnowflakeConnectionString extends ConnectionString {
    public connectionString: string;
    public type: ConnectionStringType = "Snowflake";
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

    /**
     * @deprecated Elasticsearch compatibility isn't required anymore to connect with Elasticsearch server v8.x.
     */
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
    public azureQueueStorageConnectionSettings: AzureQueueStorageConnectionSettings;
    public amazonSqsConnectionSettings: AmazonSqsConnectionSettings;
    public azureServiceBusConnectionSettings: AzureServiceBusConnectionSettings;

    public type: ConnectionStringType = "Queue";
}


export type EtlType =
    "Raven"
    | "Sql"
    | "Olap"
    | "ElasticSearch"
    | "Queue"
    | "Snowflake"
    | "GenAi"
    | "EmbeddingsGeneration";
