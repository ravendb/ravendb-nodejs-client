import { DatabaseChange } from "./DatabaseChange";

export type TimeSeriesChangeTypes = "None" | "Put" | "Delete" | "Mixed";

export interface TimeSeriesChange extends DatabaseChange {
    name: string;
    from: Date; //TODO: assert type
    to: Date; //TODO: assert type
    documentId: string;
    changeVector: string;
    type: TimeSeriesChangeTypes;
    collectionName: string;
}
