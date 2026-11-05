import { IncludeBuilderBase } from "./IncludeBuilderBase.js";
import { ISubscriptionIncludeBuilder } from "./ISubscriptionIncludeBuilder.js";
import { TimeSeriesRangeType } from "../../Operations/TimeSeries/TimeSeriesRangeType.js";
import { TimeValue } from "../../../Primitives/TimeValue.js";
import { TypeUtil } from "../../../Utility/TypeUtil.js";
import { TIME_SERIES } from "../../../Constants.js";

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
    public includeAllTimeSeries(from?: Date, to?: Date): ISubscriptionIncludeBuilder;
    public includeAllTimeSeries(typeOrFrom?: TimeSeriesRangeType | Date, timeOrCountOrTo?: number | TimeValue | Date): ISubscriptionIncludeBuilder {
        if (!typeOrFrom || typeOrFrom instanceof Date) {
            this._includeTimeSeriesFromTo("", TIME_SERIES.ALL, typeOrFrom as Date, timeOrCountOrTo as Date);
        } else if (TypeUtil.isNumber(timeOrCountOrTo)) {
            this._includeTimeSeriesByRangeTypeAndCount("", TIME_SERIES.ALL, typeOrFrom, timeOrCountOrTo);
        } else {
            this._includeTimeSeriesByRangeTypeAndTime("", TIME_SERIES.ALL, typeOrFrom, timeOrCountOrTo as TimeValue);
        }

        return this;
    }
}