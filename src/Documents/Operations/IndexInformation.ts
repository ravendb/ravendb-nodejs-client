import { IndexLockMode, IndexPriority, IndexState, IndexType } from "../Indexes/Enums";

export interface IndexInformation {
    name: string;
    isStale: boolean;
    state: IndexState;
    lockMode: IndexLockMode;
    priority: IndexPriority;
    type: IndexType;
    lastIndexingTime: Date;
}
