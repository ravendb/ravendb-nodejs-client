import { Counts, FileCounts, SmugglerResult } from "../../Documents/Smuggler/SmugglerResult.js";

export interface RestoreResult extends SmugglerResult {
    dataDirectory: string;
    journalStoragePath: string;
    snapshotRestore: Counts;
    files: FileCounts;
}
