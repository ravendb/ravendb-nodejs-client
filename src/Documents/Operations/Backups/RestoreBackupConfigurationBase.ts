import { BackupEncryptionSettings } from "./BackupEncryptionSettings.js";
import { RestoreType } from "./RestoreType.js";
import { ShardedRestoreSettings } from "./Sharding/ShardedRestoreSettings.js";

export interface RestoreBackupConfigurationBase {
    databaseName: string;
    lastFileNameToRestore: string;
    dataDirectory: string;
    encryptionKey: string;
    disableOngoingTasks: boolean;
    skipIndexes: boolean;
    maxReadOpsPerSecond?: number;

    type: RestoreType;

    shardRestoreSettings: ShardedRestoreSettings;
    backupEncryptionSettings: BackupEncryptionSettings;
}