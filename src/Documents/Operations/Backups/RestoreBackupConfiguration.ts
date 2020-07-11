export interface RestoreBackupConfiguration {
    databaseName: string;
    backupLocation: string;
    lastFileNameToRestore: string;
    dataDirectory: string;
    encryptionKey: string;
    disableOngoingTasks: boolean;
    skipIndexes: boolean;
}
