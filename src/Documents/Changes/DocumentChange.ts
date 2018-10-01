import { DatabaseChange } from "./DatabaseChange";

export interface DocumentChange extends DatabaseChange {
    type: DocumentChangeTypes;
    id: string;
    collectionName: string;
    changeVector: string;
}

export type DocumentChangeTypes =
    "None"
    | "Put"
    | "Delete"
    | "Conflict"
    | "Common";
