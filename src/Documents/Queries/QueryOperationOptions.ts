export interface QueryOperationOptions {
    maxOpsPerSecond: number;
    allowStale: boolean;
    staleTimeout: number;
    retrieveDetails: boolean;
}
