import { IncludeBuilderBase } from "./IncludeBuilderBase";
import { IQueryIncludeBuilder } from "./IQueryIncludeBuilder";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { TypeUtil } from "../../../Utility/TypeUtil";

export class QueryIncludeBuilder extends IncludeBuilderBase implements IQueryIncludeBuilder {

    public constructor(conventions: DocumentConventions) {
        super(conventions);
    }

    public includeCounter(name: string): IQueryIncludeBuilder;
    public includeCounter(path: string, name: string): IQueryIncludeBuilder;
    public includeCounter(pathOrName: string, name?: string): IQueryIncludeBuilder {
        if (TypeUtil.isUndefined(name)) {
            this._includeCounter("", pathOrName);
        } else {
            this._includeCounterWithAlias(pathOrName, name);
        }

        return this;
    }

    public includeCounters(names: string[]): IQueryIncludeBuilder;
    public includeCounters(path: string, names: string[]): IQueryIncludeBuilder;
    public includeCounters(pathOrNames: string | string[], names?: string[]): IQueryIncludeBuilder {
        if (TypeUtil.isUndefined(names)) {
            this._includeCounters("", pathOrNames as string[]);
        } else {
            this._includeCounterWithAlias(pathOrNames as string, names);
        }

        return this;
    }

    public includeAllCounters(): IQueryIncludeBuilder;
    public includeAllCounters(path: string): IQueryIncludeBuilder;
    public includeAllCounters(path?: string): IQueryIncludeBuilder {
        if (arguments.length === 1) {
            this._includeAllCountersWithAlias(path);
        } else {
            this._includeAllCounters("");
        }
        
        return this;
    }

    public includeDocuments(path: string): IQueryIncludeBuilder {
        this._includeDocuments(path);
        return this;
    }

    public includeTimeSeries(name: string): IQueryIncludeBuilder;
    public includeTimeSeries(name: string, from: Date, to: Date): IQueryIncludeBuilder;
    public includeTimeSeries(path: string, name: string): IQueryIncludeBuilder;
    public includeTimeSeries(path: string, name: string, from: Date, to: Date): IQueryIncludeBuilder;
    public includeTimeSeries(nameOrPath: string, fromOrName?: string | Date, toOrFrom?: Date, to?: Date): IQueryIncludeBuilder {
        if (TypeUtil.isString(fromOrName)) {
            this._withAlias();
            this._includeTimeSeries(nameOrPath, fromOrName, toOrFrom, to);
        } else {
            this._includeTimeSeries("", nameOrPath, fromOrName, toOrFrom);
        }

        return this;
    }

    public includeCompareExchangeValue(path: string): IQueryIncludeBuilder {
        this._includeCompareExchangeValue(path);
        return this;
    }
}
