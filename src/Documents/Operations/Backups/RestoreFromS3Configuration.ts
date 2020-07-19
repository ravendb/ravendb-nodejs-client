import { RestoreBackupConfigurationBase } from "./RestoreBackupConfigurationBase";
import { S3Settings } from "./S3Settings";

export interface RestoreFromS3Configuration extends RestoreBackupConfigurationBase {
    settings: S3Settings;
    /* TODO
    protected RestoreType getType() { return RestoreType.S3;
     */


}