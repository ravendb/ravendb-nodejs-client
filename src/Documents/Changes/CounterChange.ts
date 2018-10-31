import { DatabaseChange } from "./DatabaseChange";

export type CounterChangeTypes = "None" | "Put" | "Delete" | "Increment";

export interface CounterChange extends DatabaseChange {
    name: string;
    value: number;
    documentId: string;
    changeVector: string;
    type: CounterChangeTypes;
}
