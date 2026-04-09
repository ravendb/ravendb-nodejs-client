import { IDatabaseTaskStatus } from "../../../ServerWide/IDatabaseTaskStatus.js";
import { BackupType } from "./Enums.js";
import {
    LocalBackup,
    UploadToGoogleCloud,
    UploadToAzure,
    UploadToFtp,
    UploadToGlacier,
    UploadToS3
} from "./BackupStatus.js";
import { LastRaftIndex } from "./LastRaftIndex.js";

export interface PeriodicBackupStatus extends IDatabaseTaskStatus {
    taskId: number;
    backupType: BackupType;
    isFull: boolean;
    nodeTag: string;
    delayUntil: Date;
    originalBackupTime: Date;
    lastFullBackup: Date;
    lastIncrementalBackup: Date;
    lastFullBackupInternal: Date;
    lastIncrementalBackupInternal: Date;
    localBackup: LocalBackup;
    uploadToS3: UploadToS3;
    uploadToGlacier: UploadToGlacier;
    uploadToAzure: UploadToAzure;
    uploadToGoogleCloud: UploadToGoogleCloud;
    uploadToFtp: UploadToFtp;
    lastEtag: number;
    lastDatabaseChangeVector: string;
    lastRaftIndex: LastRaftIndex;
    folderName: string;
    durationInMs: number;
    localRetentionDurationInMs: number;
    version: number;
    error: PeriodicBackupError;
    lastOperationId: number;
    isEncrypted: boolean;
}

export class PeriodicBackupError {
    exception: string;
    at: Date;
}
