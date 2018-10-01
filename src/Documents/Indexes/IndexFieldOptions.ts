import { SpatialOptions } from "./Spatial";
import { FieldStorage, FieldIndexing, FieldTermVector } from "./Enums";

export class IndexFieldOptions {
    public storage: FieldStorage;
    public indexing: FieldIndexing;
    public termVector: FieldTermVector;
    public spatial: SpatialOptions;
    public analyzer: string;
    public suggestions: boolean;
}
