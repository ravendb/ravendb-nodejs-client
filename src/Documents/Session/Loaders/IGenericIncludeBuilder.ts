import { IDocumentIncludeBuilder } from "./IDocumentIncludeBuilder";
import { ICounterIncludeBuilder } from "./ICounterIncludeBuilder";
import { ICompareExchangeValueIncludeBuilder } from "./ICompareExchangeValueIncludeBuilder";
import { IGenericTimeSeriesIncludeBuilder } from "./IGenericTimeSeriesIncludeBuilder";
import { IGenericRevisionIncludeBuilder } from "./IGenericRevisionIncludeBuilder";

export interface IGenericIncludeBuilder<TBuilder>
    extends IDocumentIncludeBuilder<TBuilder>,
        ICounterIncludeBuilder<TBuilder>,
        IGenericTimeSeriesIncludeBuilder<TBuilder>,
        ICompareExchangeValueIncludeBuilder<TBuilder>,
        IGenericRevisionIncludeBuilder<TBuilder> {
    
}
