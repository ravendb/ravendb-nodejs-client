import { RestoreBackupConfigurationBase } from "./RestoreBackupConfigurationBase";
import { AzureSettings } from "./AzureSettings";

export interface RestoreFromAzureConfiguration extends RestoreBackupConfigurationBase {
    settings: AzureSettings;

    /* TODO
    protected RestoreType getType() { RestoreType.AZURE;
     */

}