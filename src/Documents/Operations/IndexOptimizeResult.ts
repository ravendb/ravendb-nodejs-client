import { IOperationResult } from "./IOperationResult";

export interface IndexOptimizeResult extends IOperationResult {
    indexName: string;
    message: string;
    shouldPersist: boolean;
}
