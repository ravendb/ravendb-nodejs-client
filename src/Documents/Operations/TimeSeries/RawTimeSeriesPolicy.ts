import { TimeSeriesPolicy, TimeSeriesPolicyRaw } from "./TimeSeriesPolicy";
import { TimeValue } from "../../../Primitives/TimeValue";
import { throwError } from "../../../Exceptions";

export class RawTimeSeriesPolicy extends TimeSeriesPolicy {
    public static POLICY_STRING = "rawpolicy"; // must be lower case

    public static DEFAULT_POLICY = new RawTimeSeriesPolicy();

    public constructor()
    public constructor(retentionTime: TimeValue)
    public constructor(retentionTime?: TimeValue) {
        if (retentionTime && retentionTime.compareTo(TimeValue.ZERO) <= 0) {
            throwError("InvalidArgumentException", "Retention time must be greater than zero.");
        }

        super(RawTimeSeriesPolicy.POLICY_STRING, TimeValue.MAX_VALUE, retentionTime || TimeValue.MAX_VALUE);
        this.aggregationTime = null; // hack - we need to class super here
    }

    public static parse(policy: TimeSeriesPolicyRaw) {
        const result = new RawTimeSeriesPolicy();
        result.name = policy.Name;
        result.aggregationTime = TimeValue.parse(policy.AggregationTime);
        result.retentionTime = TimeValue.parse(policy.RetentionTime);
        return result;
    }
}