import { MetadataObject } from "./MetadataObject";

export interface IRawMetadataDictionary extends MetadataObject {
    [key: string]: any;
}

export interface IMetadataDictionary extends IRawMetadataDictionary {
    isDirty(): boolean;
}
