import { DatabaseChange } from "./DatabaseChange.js";
import { OperationState } from "../Operations/OperationState.js";

export interface OperationStatusChange extends DatabaseChange {
    operationId: number;
    state: OperationState;
}
