import { IOperationResult } from "./IOperationResult.js";
import { IOperationProgress } from "./IOperationProgress.js";

export type OperationStatus = "InProgress" | "Completed" | "Faulted" | "Canceled";

export interface OperationState {
    result: IOperationResult;
    progress: IOperationProgress;
    status: OperationStatus;
}
