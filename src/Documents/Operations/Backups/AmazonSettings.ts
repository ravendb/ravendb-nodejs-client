import { BackupSettings } from "./BackupSettings";

export interface AmazonSettings extends BackupSettings {
    awsAccessKey: string;
    awsSecretKey: string;
    awsRegionName: string;
}