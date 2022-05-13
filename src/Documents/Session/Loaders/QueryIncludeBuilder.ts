import { IncludeBuilderBase } from "./IncludeBuilderBase";
import { IQueryIncludeBuilder } from "./IQueryIncludeBuilder";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { TimeSeriesRangeType } from "../../Operations/TimeSeries/TimeSeriesRangeType";
import { TimeValue } from "../../../Primitives/TimeValue";
import { IIncludeBuilder } from "./IIncludeBuilder";
import { TIME_SERIES } from "../../../Constants";

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
    public includeTimeSeries(name: string, type: TimeSeriesRangeType, time: TimeValue): IQueryIncludeBuilder;
    public includeTimeSeries(name: string, type: TimeSeriesRangeType, count: number): IQueryIncludeBuilder;
    public includeTimeSeries(names: string[], type: TimeSeriesRangeType, time: TimeValue): IQueryIncludeBuilder;
    public includeTimeSeries(names: string[], type: TimeSeriesRangeType, count: number): IQueryIncludeBuilder;
    public includeTimeSeries(nameOrPathOrNames: string | string[], fromOrNameOrType?: string | Date | TimeSeriesRangeType, toOrFromOrTimeOrCount?: Date | TimeValue | number, to?: Date): IQueryIncludeBuilder {
        if (TypeUtil.isArray(nameOrPathOrNames)) {
            if (TypeUtil.isNumber(toOrFromOrTimeOrCount)) {
                this._includeArrayOfTimeSeriesByRangeTypeAndCount(nameOrPathOrNames, fromOrNameOrType as TimeSeriesRangeType, toOrFromOrTimeOrCount);
            } else { // names + time
                this._includeArrayOfTimeSeriesByRangeTypeAndTime(nameOrPathOrNames, fromOrNameOrType as TimeSeriesRangeType, toOrFromOrTimeOrCount as TimeValue);
            }
        } else if (toOrFromOrTimeOrCount instanceof TimeValue) {
            this._includeTimeSeriesByRangeTypeAndTime("", nameOrPathOrNames, fromOrNameOrType as TimeSeriesRangeType, toOrFromOrTimeOrCount as TimeValue);
        } else if (TypeUtil.isNumber(toOrFromOrTimeOrCount)) {
            this._includeTimeSeriesByRangeTypeAndCount("", nameOrPathOrNames, fromOrNameOrType as TimeSeriesRangeType, toOrFromOrTimeOrCount);
        } else if (TypeUtil.isString(fromOrNameOrType)) {
            this._withAlias();
            this._includeTimeSeriesFromTo(nameOrPathOrNames, fromOrNameOrType, toOrFromOrTimeOrCount, to);
        } else {
            this._includeTimeSeriesFromTo("", nameOrPathOrNames, fromOrNameOrType, toOrFromOrTimeOrCount);
        }

        return this;
    }

    public includeCompareExchangeValue(path: string): IQueryIncludeBuilder {
        this._includeCompareExchangeValue(path);
        return this;
    }

    public includeAllTimeSeries(type: TimeSeriesRangeType, time: TimeValue): IQueryIncludeBuilder;
    public includeAllTimeSeries(type: TimeSeriesRangeType, count: number): IQueryIncludeBuilder;
    public includeAllTimeSeries(type: TimeSeriesRangeType, timeOrCount: number | TimeValue): IQueryIncludeBuilder {
        if (TypeUtil.isNumber(timeOrCount)) {
            this._includeTimeSeriesByRangeTypeAndCount("", TIME_SERIES.ALL, type, timeOrCount);
        } else {
            this._includeTimeSeriesByRangeTypeAndTime("", TIME_SERIES.ALL, type, timeOrCount);
        }

        return this;
    }

    public includeRevisions(path: string): IQueryIncludeBuilder;
    public includeRevisions(before: Date): IQueryIncludeBuilder;
    public includeRevisions(pathOrDate: Date | string): IQueryIncludeBuilder {
        if (TypeUtil.isString(pathOrDate)) {
            this._withAlias();
            this._includeRevisionsByChangeVectors(pathOrDate);
        } else {
            this._includeRevisionsBefore(pathOrDate);
        }

        return this;
    }
}
