
export interface KafkaConnectionSettings {
    bootstrapServers: string;
    connectionOptions?: Record<string, string>;
    useRavenCertificate?: boolean;
}
