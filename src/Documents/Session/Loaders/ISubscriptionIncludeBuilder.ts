import { IDocumentIncludeBuilder } from "./IDocumentIncludeBuilder";
import { ICounterIncludeBuilder } from "./ICounterIncludeBuilder";

export interface ISubscriptionIncludeBuilder extends IDocumentIncludeBuilder<ISubscriptionIncludeBuilder>,
    ICounterIncludeBuilder<ISubscriptionIncludeBuilder> {
    
}