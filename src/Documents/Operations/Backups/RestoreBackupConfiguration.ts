import { RestoreBackupConfigurationBase } from "./RestoreBackupConfigurationBase";

export interface RestoreBackupConfiguration extends RestoreBackupConfigurationBase {
    backupLocation: string;

    // TODO:  protected RestoreType getType() {
    //         return RestoreType.LOCAL;
    //     }
}
