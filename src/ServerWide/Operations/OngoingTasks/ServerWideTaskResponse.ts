
export interface ServerWideTaskResponse {
    name: string;
    raftCommandIndex: number;
}


// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PutServerWideBackupConfigurationResponse extends ServerWideTaskResponse {
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerWideExternalReplicationResponse extends ServerWideTaskResponse {
}
