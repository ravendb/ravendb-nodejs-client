import { TimeValue } from "../../../Primitives/TimeValue";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";

export class TimeSeriesPolicy {
    /**
     * Name of the time series policy, must be unique.
     */
    public name: string;

    /**
     * How long the data of this policy will be retained
     */
    public retentionTime: TimeValue;

    /**
     * Define the aggregation of this policy
     */
    public aggregationTime: TimeValue;

    public getTimeSeriesName(rawName: string): string {
        return rawName + TimeSeriesConfiguration.TIME_SERIES_ROLLUP_SEPARATOR + this.name;
    }

    public constructor(name: string, aggregationTime: TimeValue);
    public constructor(name: string, aggregationTime: TimeValue, retentionTime: TimeValue);
    public constructor(name: string, aggregationTime: TimeValue, retentionTime?: TimeValue) {
        retentionTime = retentionTime || TimeValue.MAX_VALUE;
        if (StringUtil.isNullOrEmpty(name)) {
            throwError("InvalidArgumentException", "Name cannot be null or empty");
        }

        if (aggregationTime.compareTo(TimeValue.ZERO) <= 0) {
            throwError("InvalidArgumentException", "Aggregation time must be greater than zero");
        }

        if (retentionTime.compareTo(TimeValue.ZERO) <= 0) {
            throwError("InvalidArgumentException", "Retention time must be greater than zero");
        }

        this.retentionTime = retentionTime;
        this.aggregationTime = aggregationTime;
        this.name = name;
    }
}
