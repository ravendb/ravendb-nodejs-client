import { RestoreBackupConfigurationBase } from "./RestoreBackupConfigurationBase";
import { AzureSettings } from "./AzureSettings";

export interface RestoreFromAzureConfiguration extends RestoreBackupConfigurationBase {
    settings: AzureSettings;
    type: "Azure";
}