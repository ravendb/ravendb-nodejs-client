import { UploadProgress } from "./UploadProgress";
import { CompressionLevel } from "./CompressionLevel";

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
    fileName: string;
    tempFolderUsed: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UploadToAzure extends CloudUploadStatus {
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UpdateToGoogleCloud extends CloudUploadStatus {
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UploadToFtp extends CloudUploadStatus {
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UploadToGlacier extends CloudUploadStatus {
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UploadToS3 extends CloudUploadStatus {
}

export type UploadType =
    "Regular"
    | "Chunked";

export interface SnapshotSettings {
    compressionLevel: CompressionLevel;
    excludeIndexes?: boolean;
}
