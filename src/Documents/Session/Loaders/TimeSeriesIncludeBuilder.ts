import { IncludeBuilderBase } from "./IncludeBuilderBase";
import { ITimeSeriesIncludeBuilder } from "./ITimeSeriesIncludeBuilder";

export class TimeSeriesIncludeBuilder extends IncludeBuilderBase implements ITimeSeriesIncludeBuilder {

    public includeTags(): ITimeSeriesIncludeBuilder {
        this.includeTimeSeriesTags = true;
        return this;
    }

    includeDocument(): ITimeSeriesIncludeBuilder {
        this.includeTimeSeriesDocument = true;
        return this;
    }
}