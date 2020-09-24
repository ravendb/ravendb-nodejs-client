import { IncludeBuilderBase } from "./IncludeBuilderBase";
import { ISubscriptionIncludeBuilder } from "./ISubscriptionIncludeBuilder";

export class SubscriptionIncludeBuilder extends IncludeBuilderBase implements ISubscriptionIncludeBuilder {

    public includeDocuments(path: string) {
        this._includeDocuments(path);
        return this;
    }
}