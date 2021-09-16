import { SubscriptionConnectionServerMessage } from "./SubscriptionConnectionServerMessage";

export interface BatchFromServer {
    messages: SubscriptionConnectionServerMessage[];
    includes: object[];
    counterIncludes: CounterIncludeItem[];
    timeSeriesIncludes: object[];
}

export interface CounterIncludeItem {
    includes: object;
    counterIncludes: Record<string, string[]>;
}