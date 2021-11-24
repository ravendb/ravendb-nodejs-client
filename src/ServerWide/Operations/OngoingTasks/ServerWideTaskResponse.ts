
export interface ServerWideTaskResponse {
    name: string;
    raftCommandIndex: number;
}


// tslint:disable-next-line:no-empty-interface
export interface PutServerWideBackupConfigurationResponse extends ServerWideTaskResponse {
}

// tslint:disable-next-line:no-empty-interface
export interface ServerWideExternalReplicationResponse extends ServerWideTaskResponse {
}