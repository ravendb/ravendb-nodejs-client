import { UploadProgress } from "./UploadProgress";

export interface BackupStatus {
    lastFullBackup: Date;
    lastIncrementalBackup: Date;
    fullBackupDurationInMs: number;
    incrementalBackupDurationIsMs: number;
    exception: string;
}

export interface CloudUploadStatus extends BackupStatus {
    uploadProgress: UploadProgress;
    skipped: boolean;
}

export interface LocalBackup extends BackupStatus {
    backupDirectory: string;
    tempFolderUsed: boolean;
}

export interface UploadToAzure extends CloudUploadStatus {
}

export interface UploadToFtp extends CloudUploadStatus {
}

export interface UploadToGlacier extends CloudUploadStatus {
}

export interface UploadToS3 extends CloudUploadStatus {
}

export type UploadType =
    "Regular"
    | "Chunked";
