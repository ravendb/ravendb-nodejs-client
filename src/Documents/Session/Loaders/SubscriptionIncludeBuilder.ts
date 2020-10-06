import { IncludeBuilderBase } from "./IncludeBuilderBase";
import { ISubscriptionIncludeBuilder } from "./ISubscriptionIncludeBuilder";

export class SubscriptionIncludeBuilder extends IncludeBuilderBase implements ISubscriptionIncludeBuilder {

    public includeDocuments(path: string): ISubscriptionIncludeBuilder {
        this._includeDocuments(path);
        return this;
    }

    public includeCounter(name: string): ISubscriptionIncludeBuilder {
        this._includeCounter("", name);
        return this;
    }

    public includeCounters(names: string[]): ISubscriptionIncludeBuilder {
        this._includeCounters("", names);
        return this;
    }

    public includeAllCounters(): ISubscriptionIncludeBuilder {
        this._includeAllCounters("");
        return this;
    }
}