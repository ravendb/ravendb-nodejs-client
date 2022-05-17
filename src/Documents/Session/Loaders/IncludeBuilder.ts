import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { IncludeBuilderBase } from "./IncludeBuilderBase";
import { IIncludeBuilder } from "./IIncludeBuilder";
import { TimeSeriesRangeType } from "../../Operations/TimeSeries/TimeSeriesRangeType";
import { TimeValue } from "../../../Primitives/TimeValue";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { TIME_SERIES } from "../../../Constants";

export class IncludeBuilder extends IncludeBuilderBase implements IIncludeBuilder {
    public constructor(conventions: DocumentConventions) {
        super(conventions);
    }

    public includeDocuments(path: string): IIncludeBuilder {
        this._includeDocuments(path);
        return this;
    }

    public includeCounter(name: string): IIncludeBuilder;
    public includeCounter(path: string, name: string): IIncludeBuilder;
    public includeCounter(pathOrName: string, name?: string): IIncludeBuilder {
        if (arguments.length === 1) {
            this._includeCounter("", pathOrName);
        } else {
            this._includeCounterWithAlias(pathOrName, name);
        }

        return this;
    }

    public includeCounters(names: string[]): IIncludeBuilder;
    public includeCounters(path: string, names: string[]): IIncludeBuilder;
    public includeCounters(pathOrNames: string | string[], names?: string[]): IIncludeBuilder {
        if (arguments.length === 1) {
            this._includeCounters("", pathOrNames as string[]);
        } else {
            this._includeCounterWithAlias(pathOrNames as string, names);
        }

        return this;
    }

    public includeAllCounters(): IIncludeBuilder {
        this._includeAllCounters("");
        return this;
    }

    public includeTimeSeries(name: string);
    public includeTimeSeries(name: string, from: Date, to: Date);
    public includeTimeSeries(name: string, type: TimeSeriesRangeType, time: TimeValue): IIncludeBuilder;
    public includeTimeSeries(name: string, type: TimeSeriesRangeType, count: number): IIncludeBuilder;
    public includeTimeSeries(names: string[], type: TimeSeriesRangeType, time: TimeValue): IIncludeBuilder;
    public includeTimeSeries(names: string[], type: TimeSeriesRangeType, count: number): IIncludeBuilder;
    public includeTimeSeries(nameOrNames: string | string[], fromOrType?: Date | TimeSeriesRangeType, toOrTimeOrCount?: Date | number | TimeValue) {
        if (!fromOrType || fromOrType instanceof Date) {
            this._includeTimeSeriesFromTo("", nameOrNames as string, fromOrType as Date, toOrTimeOrCount as Date);
        } else {
            if (TypeUtil.isArray(nameOrNames)) {
                if (TypeUtil.isNumber(toOrTimeOrCount)) {
                    this._includeArrayOfTimeSeriesByRangeTypeAndCount(nameOrNames, fromOrType, toOrTimeOrCount);
                } else { // names + time
                    this._includeArrayOfTimeSeriesByRangeTypeAndTime(nameOrNames, fromOrType, toOrTimeOrCount as TimeValue);
                }
            } else { // name
                if (TypeUtil.isNumber(toOrTimeOrCount)) {
                    this._includeTimeSeriesByRangeTypeAndCount("", nameOrNames, fromOrType, toOrTimeOrCount);
                } else { // name + time
                    this._includeTimeSeriesByRangeTypeAndTime("", nameOrNames, fromOrType, toOrTimeOrCount as TimeValue);
                }
            }
        }

        return this;
    }

    public includeCompareExchangeValue(path: string) {
        this._includeCompareExchangeValue(path);
        return this;
    }

    public includeAllTimeSeries(type: TimeSeriesRangeType, time: TimeValue): IIncludeBuilder;
    public includeAllTimeSeries(type: TimeSeriesRangeType, count: number): IIncludeBuilder;
    public includeAllTimeSeries(type: TimeSeriesRangeType, timeOrCount: number | TimeValue): IIncludeBuilder {
        if (TypeUtil.isNumber(timeOrCount)) {
            this._includeTimeSeriesByRangeTypeAndCount("", TIME_SERIES.ALL, type, timeOrCount);
        } else {
            this._includeTimeSeriesByRangeTypeAndTime("", TIME_SERIES.ALL, type, timeOrCount);
        }

        return this;
    }

    includeRevisions(path: string): IIncludeBuilder;
    includeRevisions(before: Date): IIncludeBuilder;
    includeRevisions(pathOrDate: string | Date): IIncludeBuilder {
        if (TypeUtil.isString(pathOrDate)) {
            this._withAlias();
            this._includeRevisionsByChangeVectors(pathOrDate);
            return this;
        } else {
            this._includeRevisionsBefore(pathOrDate);
            return this;
        }
    }
}
