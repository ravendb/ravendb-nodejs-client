import { PeriodicBackupConfiguration } from "../../../Documents/Operations/Backups/PeriodicBackupConfiguration";

export interface ServerWideBackupConfiguration extends PeriodicBackupConfiguration {
    namePrefix: string; //TODO: check me!
}