import { UploadType } from "./BackupStatus";
import { UploadState } from "./UploadState";

export interface UploadProgress {
    uploadType: UploadType;
    uploadState: UploadState;
    uploadedInBytes: number;
    totalInBytes: number;
    bytesPutsPerSec: number;
    uploadTimeInMs: number;
}
