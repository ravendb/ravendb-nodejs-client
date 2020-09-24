import { BackupSettings } from "./BackupSettings";

export interface AmazonSettings extends BackupSettings {
    awsAccessKey: string;
    awsSecretKey: string;
    awsSessionToken: string;
    awsRegionName: string;
    remoteFolderName: string;
}