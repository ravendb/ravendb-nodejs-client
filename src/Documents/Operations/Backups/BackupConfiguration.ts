import { BackupType } from "./Enums";
import { SnapshotSettings } from "./BackupStatus";
import { BackupEncryptionSettings } from "./BackupEncryptionSettings";
import { LocalSettings } from "./LocalSettings";
import { S3Settings } from "./S3Settings";
import { GlacierSettings } from "./GlacierSettings";
import { AzureSettings } from "./AzureSettings";
import { FtpSettings } from "./FtpSettings";
import { GoogleCloudSettings } from "./GoogleCloudSettings";

export interface BackupConfiguration {

    backupType?: BackupType;
    snapshotSettings?: SnapshotSettings;
    backupEncryptionSettings?: BackupEncryptionSettings;

    localSettings?: LocalSettings;
    s3Settings?: S3Settings;
    glacierSettings?: GlacierSettings;
    azureSettings?: AzureSettings;
    ftpSettings?: FtpSettings;
    googleCloudSettings?: GoogleCloudSettings;
}
