import { IOperationResult } from "./IOperationResult.js";
import { OperationExceptionResult } from "./OperationAbstractions.js";

export interface OperationMultipleExceptionsResult extends IOperationResult {
    exceptions: OperationExceptionResult[];
}
