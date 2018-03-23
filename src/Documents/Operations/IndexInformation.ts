
import { IndexState, IndexType } from "../../Primitives/Indexing";
import { IndexLockMode } from "../../Documents/Indexes/IndexLockMode";
import { IndexPriority } from "../../Documents/Indexes/IndexPriority";

export interface IndexInformation {
   name: string;
   isStale: boolean;
   state: IndexState;
   lockMode: IndexLockMode;
   priority: IndexPriority;
   type: IndexType;
   lastIndexingTime: Date;
}
