import { SmugglerProgress } from "../../Smuggler/SmugglerResult.js";
import { IShardedOperationProgress } from "../IOperationProgress.js";
import { BackupResult } from "./BackupResult.js";

export type BackupProgress = SmugglerProgress
    & Pick<BackupResult, "snapshotBackup" | "s3Backup" | "azureBackup" | "googleCloudBackup" | "glacierBackup" | "ftpBackup">;

export type ShardedBackupProgress = BackupProgress & IShardedOperationProgress;
