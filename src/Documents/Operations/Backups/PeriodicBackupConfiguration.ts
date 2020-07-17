import { BackupType } from "./Enums";
import { BackupEncryptionSettings } from "./BackupEncryptionSettings";
import { LocalSettings } from "./LocalSettings";
import { GlacierSettings } from "./GlacierSettings";
import { AzureSettings } from "./AzureSettings";
import { FtpSettings } from "./FtpSettings";
import { S3Settings } from "./S3Settings";

export interface PeriodicBackupConfiguration {
    taskId?: number;
    disabled?: boolean;
    name: string;
    mentorNode?: string;
    backupType: BackupType;
    backupEncryptionSettings?: BackupEncryptionSettings;
    retentionPolicy?: RetentionPolicy;
    snapshotSettings?: SnapshotSettings;

    localSettings?: LocalSettings;
    s3Settings?: S3Settings;
    glacierSettings?: GlacierSettings;
    azureSettings?: AzureSettings;
    ftpSettings?: FtpSettings;
    googleCloudSettings?: GoogleCloudSettings;

    fullBackupFrequency?: string;
    incrementalBackupFrequency?: string;
}