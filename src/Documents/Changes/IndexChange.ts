import { DatabaseChange } from "./DatabaseChange";

export interface IndexChange extends DatabaseChange {
    type: IndexChangeTypes;
    name: string;
}

export type IndexChangeTypes =
    "None"
    | "BatchCompleted"
    | "IndexAdded"
    | "IndexRemoved"
    | "IndexDemotedToIdle"
    | "IndexPromotedFromIdle"
    | "IndexDemotedToDisabled"
    | "IndexMarkedAsErrored"
    | "SideBySideReplace"
    | "Renamed"
    | "IndexPaused"
    | "LockModeChanged"
    | "PriorityChanged"
    ;
