import { IndexPriority, IndexState, IndexType } from "./Enums";
import { AutoIndexFieldOptions } from "./AutoIndexFieldOptions";


export interface AutoIndexDefinition {
    type: IndexType;
    name: string;
    priority: IndexPriority;
    state: IndexState;
    collection: string;
    mapFields: Record<string, AutoIndexFieldOptions>;
    groupByFields: Record<string, AutoIndexFieldOptions>;
}