
export interface ServerWideTaskResponse {
    name: String;
    raftCommandIndex: number;
}


export interface PutServerWideBackupConfigurationResponse extends ServerWideTaskResponse {
}

export interface ServerWideExternalReplicationResponse extends ServerWideTaskResponse {
}