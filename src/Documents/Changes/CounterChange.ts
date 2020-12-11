import { DatabaseChange } from "./DatabaseChange";

export type CounterChangeTypes = "None" | "Put" | "Delete" | "Increment";

export interface CounterChange extends DatabaseChange {
    name: string;
    value: number;
    documentId: string;
    collectionName: string;
    changeVector: string;
    type: CounterChangeTypes;
}
