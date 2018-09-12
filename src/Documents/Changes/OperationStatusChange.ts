import {DatabaseChange} from "./DatabaseChange";

export interface OperationStatusChange extends DatabaseChange {
    operationId: number;
    state: any;
}