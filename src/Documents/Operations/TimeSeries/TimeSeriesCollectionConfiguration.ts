import { TimeSeriesPolicy } from "./TimeSeriesPolicy";
import { RawTimeSeriesPolicy } from "./RawTimeSeriesPolicy";

export class TimeSeriesCollectionConfiguration {
    public disabled: boolean;

    /**
     * Specify roll up and retention policy.
     * Each policy will create a new time-series aggregated from the previous one
     */
    public policies: TimeSeriesPolicy[] = [];

    /**
     * Specify a policy for the original time-series
     */
    public rawPolicy = RawTimeSeriesPolicy.DEFAULT_POLICY;


    public static isRaw(policy: TimeSeriesPolicy): boolean {
        return RawTimeSeriesPolicy.DEFAULT_POLICY.name === policy.name;
    }
}
