import { BackupStatus } from "./BackupStatus";

export interface GoogleCloudSettings extends BackupStatus {

    bucketName: string;
    remoteFolderName: string;
    googleCredentialsJson: string;

}