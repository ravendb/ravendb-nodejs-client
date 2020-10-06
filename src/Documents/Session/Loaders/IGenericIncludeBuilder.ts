import { IDocumentIncludeBuilder } from "./IDocumentIncludeBuilder";
import { ICounterIncludeBuilder } from "./ICounterIncludeBuilder";
import { ITimeSeriesIncludeBuilder } from "./ITimeSeriesIncludeBuilder";

export interface IGenericIncludeBuilder<TBuilder>
    extends IDocumentIncludeBuilder<TBuilder>,
        ICounterIncludeBuilder<TBuilder>,
        ITimeSeriesIncludeBuilder<TBuilder>,
        ICompareExchangeValueIncludeBuilder<TBuilder> {
    
}