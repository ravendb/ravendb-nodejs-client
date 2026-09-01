import { AmazonSettings } from "./AmazonSettings.js";

export interface S3Settings extends AmazonSettings {
    bucketName: string;
    customServerUrl: string;
    forcePathStyle: boolean;
    disableChecksumValidation: boolean;
}
