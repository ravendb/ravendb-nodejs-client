export interface IRawMetadataDictionary { 
    [key: string]: any;
}

export interface IMetadataDictionary extends IRawMetadataDictionary {
    isDirty(): boolean;
}
