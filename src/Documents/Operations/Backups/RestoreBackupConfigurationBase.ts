import { BackupEncryptionSettings } from "./BackupEncryptionSettings";

export interface RestoreBackupConfigurationBase {
    databaseName: string;
    lastFileNameToRestore: string;
    dataDirectory: string;
    encryptionKey: string;
    disableOngoingTasks: boolean;
    skipIndexes: boolean;

    //TODO: protected abstract RestoreType getType();

    backupEncryptionSettings: BackupEncryptionSettings;
}