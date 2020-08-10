import { IDocumentIncludeBuilder } from "./IDocumentIncludeBuilder";
import { ICounterIncludeBuilder } from "./ICounterIncludeBuilder";

export interface IGenericIncludeBuilder<TBuilder> extends IDocumentIncludeBuilder<TBuilder>, ICounterIncludeBuilder<TBuilder> {
    
}