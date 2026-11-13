import { Counts, SmugglerResult } from "../../Smuggler/SmugglerResult.js";
import { LocalBackup, UploadToAzure, UploadToFtp, UploadToGlacier, UploadToGoogleCloud, UploadToS3 } from "./BackupStatus.js";

/** Operation results are not revived, so their dates stay ISO strings. */
export type WithDatesAsStrings<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };

export interface BackupResult extends SmugglerResult {
    snapshotBackup: Counts;
    s3Backup: WithDatesAsStrings<UploadToS3>;
    azureBackup: WithDatesAsStrings<UploadToAzure>;
    googleCloudBackup: WithDatesAsStrings<UploadToGoogleCloud>;
    glacierBackup: WithDatesAsStrings<UploadToGlacier>;
    ftpBackup: WithDatesAsStrings<UploadToFtp>;
    localBackup: WithDatesAsStrings<LocalBackup>;
}
