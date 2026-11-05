import { BackupType, BackupUploadMode } from "./Enums.js";
import { SnapshotSettings } from "./BackupStatus.js";
import { BackupEncryptionSettings } from "./BackupEncryptionSettings.js";
import { LocalSettings } from "./LocalSettings.js";
import { S3Settings } from "./S3Settings.js";
import { GlacierSettings } from "./GlacierSettings.js";
import { AzureSettings } from "./AzureSettings.js";
import { FtpSettings } from "./FtpSettings.js";
import { GoogleCloudSettings } from "./GoogleCloudSettings.js";

export interface BackupConfiguration {

    backupType?: BackupType;
    backupUploadMode?: BackupUploadMode;
    snapshotSettings?: SnapshotSettings;
    backupEncryptionSettings?: BackupEncryptionSettings;

    localSettings?: LocalSettings;
    s3Settings?: S3Settings;
    glacierSettings?: GlacierSettings;
    azureSettings?: AzureSettings;
    ftpSettings?: FtpSettings;
    googleCloudSettings?: GoogleCloudSettings;

    maxReadOpsPerSecond?: number;
}
