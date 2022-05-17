import { IndexPriority, IndexState, IndexType } from "./Enums";
import { AutoIndexFieldOptions } from "./AutoIndexFieldOptions";
import { IndexDefinitionBase } from "./IndexDefinitionBase";


export interface AutoIndexDefinition extends IndexDefinitionBase {
    type: IndexType;
    collection: string;
    mapFields: Record<string, AutoIndexFieldOptions>;
    groupByFields: Record<string, AutoIndexFieldOptions>;
}
