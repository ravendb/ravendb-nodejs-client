import { IDatabaseTaskStatus } from "../../../ServerWide/IDatabaseTaskStatus";
import { BackupType } from "./Enums";
import { LocalBackup, UploadToAzure, UploadToFtp, UploadToGlacier, UploadToS3 } from "./BackupStatus";
import { LastRaftIndex } from "./LastRaftIndex";

export interface PeriodicBackupStatus extends IDatabaseTaskStatus {
    taskId: number;
    backupType: BackupType;
    isFull: boolean;
    nodeTag: string;
    lastFullBackup: Date;
    lastIncrementalBackup: Date;
    lastFullBackupInternal: Date;
    lastIncrementalBackupInternal: Date;
    localBackup: LocalBackup;
    uploadToS3: UploadToS3;
    uploadToGlacier: UploadToGlacier;
    uploadToAzure: UploadToAzure;
    updateToGoogleCloud: UpdateToGoogleCloud;
    uploadToFtp: UploadToFtp;
    lastEtag: number;
    lastDatabaseChangeVector: string;
    lastRaftIndex: LastRaftIndex;
    folderName: string;
    durationInMs: number;
    version: number;
    error: PeriodicBackupError;
    lastOperationId: number;
}

export class PeriodicBackupError {
    exception: string;
    at: Date;
}