
export interface ServerWideTaskResponse {
    name: string;
    raftCommandIndex: number;
}


export interface PutServerWideBackupConfigurationResponse extends ServerWideTaskResponse {
}

export interface ServerWideExternalReplicationResponse extends ServerWideTaskResponse {
}