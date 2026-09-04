import { AmazonSettings } from "./AmazonSettings.js";

export interface S3Settings extends AmazonSettings {
    bucketName: string;
    customServerUrl: string;
    forcePathStyle: boolean;

    /**
     * Disables checksum validation for S3 uploads.
     * Checksum validation ensures data integrity and should not be disabled if not necessary.
     * Set this to true if your S3-compatible storage does not support modern object integrity checks.
     */
    disableChecksumValidation?: boolean;
}
