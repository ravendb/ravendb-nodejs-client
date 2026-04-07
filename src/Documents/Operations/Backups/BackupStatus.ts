import { UploadProgress } from "./UploadProgress.js";
import { CompressionLevel } from "./CompressionLevel.js";
import { SnapshotBackupCompressionAlgorithm } from "./Enums.js";

export interface BackupStatus {
    lastFullBackup: Date;
    lastIncrementalBackup: Date;
    fullBackupDurationInMs: number;
    incrementalBackupDurationInMs: number;
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
export interface UploadToGoogleCloud extends CloudUploadStatus {
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
    compressionAlgorithm: SnapshotBackupCompressionAlgorithm;
    compressionLevel: CompressionLevel;
    excludeIndexes?: boolean;
}
