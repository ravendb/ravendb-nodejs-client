
import { IndexState, IndexType } from "../../Primitives/Indexing";
import { IndexLockMode, IndexPriority } from "../Indexes/Enums";

export interface IndexInformation {
   name: string;
   isStale: boolean;
   state: IndexState;
   lockMode: IndexLockMode;
   priority: IndexPriority;
   type: IndexType;
   lastIndexingTime: Date;
}
