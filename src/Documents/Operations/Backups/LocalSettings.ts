import { BackupSettings } from "./BackupSettings";

export interface LocalSettings extends BackupSettings {
    folderPath: string;
}