import { AmazonSettings } from "./AmazonSettings";

export interface S3Settings extends AmazonSettings {
    bucketName: string;
    remoteFolderName: string;
}