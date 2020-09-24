import { RestoreBackupConfigurationBase } from "./RestoreBackupConfigurationBase";

export interface RestoreBackupConfiguration extends RestoreBackupConfigurationBase {
    backupLocation: string;

    type: "Local";
}
