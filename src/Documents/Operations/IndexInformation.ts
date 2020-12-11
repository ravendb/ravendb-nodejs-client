import { IndexLockMode, IndexPriority, IndexState, IndexType } from "../Indexes/Enums";
import { IndexSourceType } from "../Indexes/IndexSourceType";

export interface IndexInformation {
    name: string;
    isStale: boolean;
    state: IndexState;
    lockMode: IndexLockMode;
    priority: IndexPriority;
    type: IndexType;
    lastIndexingTime: Date;
    sourceType: IndexSourceType;
}
