import { DatabaseChange } from "./DatabaseChange";
import { DocumentChange } from "./DocumentChange";
import { IndexChange } from "./IndexChange";

export class AggressiveCacheChange implements DatabaseChange {
    public static readonly INSTANCE = new AggressiveCacheChange();

    public static shouldUpdateAggressiveCache(change: DocumentChange | IndexChange): boolean {
        return change.type === "Put" || change.type === "Delete" || change.type === "BatchCompleted" || change.type === "IndexRemoved";
    }
}
