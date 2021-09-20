import { IDocumentIncludeBuilder } from "./IDocumentIncludeBuilder";
import { ICounterIncludeBuilder } from "./ICounterIncludeBuilder";
import { ISubscriptionTimeSeriesIncludeBuilder } from "./ISubscriptionTimeSeriesIncludeBuilder";

export interface ISubscriptionIncludeBuilder extends IDocumentIncludeBuilder<ISubscriptionIncludeBuilder>,
    ICounterIncludeBuilder<ISubscriptionIncludeBuilder>, ISubscriptionTimeSeriesIncludeBuilder<ISubscriptionIncludeBuilder> {
}