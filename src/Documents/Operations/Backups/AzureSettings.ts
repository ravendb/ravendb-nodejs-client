import { BackupSettings } from "./BackupSettings";

export interface AzureSettings extends BackupSettings {
    storageContainer: string;
    remoteFolderName: string;
    accountName: string;
    accountKey: string;
}