import { IOperationResult } from "./IOperationResult.js";
import { PatchStatus } from "./PatchStatus.js";

export interface BulkOperationResult extends IOperationResult {
    total: number;
    documentsProcessed: number;
    attachmentsProcessed: number;
    countersProcessed: number;
    timeSeriesProcessed: number;
    query: string;
    details: IBulkOperationDetails[];
}

export interface IBulkOperationDetails {
}

export interface BulkOperationPatchDetails extends IBulkOperationDetails {
    id: string;
    changeVector: string;
    status: PatchStatus;
}

export interface BulkOperationDeleteDetails extends IBulkOperationDetails {
    id: string;
    etag: number;
}
