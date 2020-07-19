
export interface GetBackupConfigurationScript {
    exec: string;
    arguments: string;
    timeoutInMs: number; //TODO: default to 10_000
}