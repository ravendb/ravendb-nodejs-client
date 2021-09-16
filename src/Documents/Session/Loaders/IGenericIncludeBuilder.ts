import { IDocumentIncludeBuilder } from "./IDocumentIncludeBuilder";
import { ICounterIncludeBuilder } from "./ICounterIncludeBuilder";
import { ICompareExchangeValueIncludeBuilder } from "./ICompareExchangeValueIncludeBuilder";
import { IGenericTimeSeriesIncludeBuilder } from "./IGenericTimeSeriesIncludeBuilder";

export interface IGenericIncludeBuilder<TBuilder>
    extends IDocumentIncludeBuilder<TBuilder>,
        ICounterIncludeBuilder<TBuilder>,
        IGenericTimeSeriesIncludeBuilder<TBuilder>,
        ICompareExchangeValueIncludeBuilder<TBuilder> {
    
}