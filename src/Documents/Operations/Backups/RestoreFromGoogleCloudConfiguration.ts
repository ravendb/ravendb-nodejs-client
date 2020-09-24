import { RestoreBackupConfigurationBase } from "./RestoreBackupConfigurationBase";
import { GoogleCloudSettings } from "./GoogleCloudSettings";

export interface RestoreFromGoogleCloudConfiguration extends RestoreBackupConfigurationBase {
    settings: GoogleCloudSettings;
    type: "GoogleCloud";
}