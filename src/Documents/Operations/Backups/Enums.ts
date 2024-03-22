
export type BackupType =
    "Backup"
    | "Snapshot";

export type BackupUploadMode =
    "Default"
    | "DirectUpload";

export type EncryptionMode =
    "None"
    | "UseDatabaseKey"
    | "UseProvidedKey";


export type SnapshotBackupCompressionAlgorithm =
    "Zstd"
    | "Deflate";