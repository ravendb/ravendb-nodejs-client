import { TimeSeriesPolicy } from "./TimeSeriesPolicy";
import { RawTimeSeriesPolicy } from "./RawTimeSeriesPolicy";
import { TimeSeriesCollectionConfigurationRaw } from "./RawTimeSeriesTypes";

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

    public serialize(): TimeSeriesCollectionConfigurationRaw {
        return {
            Disabled: this.disabled,
            Policies: this.policies ? this.policies.map(p => p.serialize()) : null,
            RawPolicy: this.rawPolicy ? this.rawPolicy.serialize() : null
        }
    }

    public static parse(collectionRaw: TimeSeriesCollectionConfigurationRaw) {
        const configuration = new TimeSeriesCollectionConfiguration();
        configuration.disabled = collectionRaw.Disabled;
        configuration.policies = collectionRaw.Policies.map(x => TimeSeriesPolicy.parse(x));
        configuration.rawPolicy = RawTimeSeriesPolicy.parse(collectionRaw.RawPolicy);
        return configuration;
    }
}

