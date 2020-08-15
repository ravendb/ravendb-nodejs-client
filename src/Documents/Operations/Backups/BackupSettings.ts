import { GetBackupConfigurationScript } from "./GetBackupConfigurationScript";

export interface BackupSettings {
    disabled?: boolean;
    getBackupConfigurationScript?: GetBackupConfigurationScript;
}