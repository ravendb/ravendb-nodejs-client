
export interface BulkInsertProgress {
    total: number;
    batchCount: number;
    lastProcessedId: string;

    documentsProcessed: number;
    attachmentsProcessed: number;
    countersProcessed: number;
    timeSeriesProcessed: number;
}
