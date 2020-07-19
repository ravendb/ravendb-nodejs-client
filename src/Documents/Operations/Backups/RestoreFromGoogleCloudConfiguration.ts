import { RestoreBackupConfigurationBase } from "./RestoreBackupConfigurationBase";
import { GoogleCloudSettings } from "./GoogleCloudSettings";

export interface RestoreFromGoogleCloudConfiguration extends RestoreBackupConfigurationBase {
    settings: GoogleCloudSettings;

    //TODO:  protected RestoreType getType() { return RestoreType.GOOGLE_CLOUD;

}