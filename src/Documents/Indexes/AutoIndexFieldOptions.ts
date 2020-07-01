import { AggregationOperation, AutoFieldIndexing, FieldStorage, GroupByArrayBehavior } from "./Enums";
import { AutoSpatialOptions } from "./Spatial/AutoSpatialOptions";

export interface AutoIndexFieldOptions {
    storage: FieldStorage;
    indexing: AutoFieldIndexing;
    aggregation: AggregationOperation;
    spatial: AutoSpatialOptions;
    groupByArrayBehavior: GroupByArrayBehavior;
    suggestions: boolean;
    isNameQuoted: boolean;
}