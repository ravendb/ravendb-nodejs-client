import { BackupEncryptionSettings } from "./BackupEncryptionSettings";
import { RestoreType } from "./RestoreType";

export interface RestoreBackupConfigurationBase {
    databaseName: string;
    lastFileNameToRestore: string;
    dataDirectory: string;
    encryptionKey: string;
    disableOngoingTasks: boolean;
    skipIndexes: boolean;

    type: RestoreType;

    backupEncryptionSettings: BackupEncryptionSettings;
}