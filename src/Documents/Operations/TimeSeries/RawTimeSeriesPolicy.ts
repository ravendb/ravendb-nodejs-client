import { TimeSeriesPolicy } from "./TimeSeriesPolicy";
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
        super(RawTimeSeriesPolicy.POLICY_STRING, null, retentionTime || TimeValue.MAX_VALUE);
    }
}