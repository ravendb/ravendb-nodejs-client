import { IncludeBuilderBase } from "./IncludeBuilderBase";
import { ISubscriptionIncludeBuilder } from "./ISubscriptionIncludeBuilder";
import { TimeSeriesRangeType } from "../../Operations/TimeSeries/TimeSeriesRangeType";
import { TimeValue } from "../../../Primitives/TimeValue";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { TIME_SERIES } from "../../../Constants";

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

    public includeTimeSeries(name: string, type: TimeSeriesRangeType, time: TimeValue): ISubscriptionIncludeBuilder;
    public includeTimeSeries(name: string, type: TimeSeriesRangeType, count: number): ISubscriptionIncludeBuilder;
    public includeTimeSeries(names: string[], type: TimeSeriesRangeType, time: TimeValue): ISubscriptionIncludeBuilder;
    public includeTimeSeries(names: string[], type: TimeSeriesRangeType, count: number): ISubscriptionIncludeBuilder;
    public includeTimeSeries(nameOrNames: string | string[], type: TimeSeriesRangeType, timeOrCount: number | TimeValue): ISubscriptionIncludeBuilder {
        if (TypeUtil.isArray(nameOrNames)) {
            if (TypeUtil.isNumber(timeOrCount)) {
                this._includeArrayOfTimeSeriesByRangeTypeAndCount(nameOrNames, type, timeOrCount);
            } else { // names + time
                this._includeArrayOfTimeSeriesByRangeTypeAndTime(nameOrNames, type, timeOrCount);
            }
        } else { // name
            if (TypeUtil.isNumber(timeOrCount)) {
                this._includeTimeSeriesByRangeTypeAndCount("", nameOrNames, type, timeOrCount);
            } else { // name + time
                this._includeTimeSeriesByRangeTypeAndTime("", nameOrNames, type, timeOrCount);
            }
        }

        return this;
    }


    public includeAllTimeSeries(type: TimeSeriesRangeType, time: TimeValue): ISubscriptionIncludeBuilder;
    public includeAllTimeSeries(type: TimeSeriesRangeType, count: number): ISubscriptionIncludeBuilder;
    public includeAllTimeSeries(type: TimeSeriesRangeType, timeOrCount: number | TimeValue): ISubscriptionIncludeBuilder {
        if (TypeUtil.isNumber(timeOrCount)) {
            this._includeTimeSeriesByRangeTypeAndCount("", TIME_SERIES.ALL, type, timeOrCount);
        } else {
            this._includeTimeSeriesByRangeTypeAndTime("", TIME_SERIES.ALL, type, timeOrCount);
        }

        return this;
    }
}