import { CaseInsensitiveKeysMap } from "../../../Primitives/CaseInsensitiveKeysMap";
import {
    TimeSeriesCollectionConfiguration,
    TimeSeriesCollectionConfigurationRaw
} from "./TimeSeriesCollectionConfiguration";
import { TimeUtil } from "../../../Utility/TimeUtil";
import { throwError } from "../../../Exceptions";

export class TimeSeriesConfiguration {
    public static TIME_SERIES_ROLLUP_SEPARATOR: string = "@";

    public collections: Map<string, TimeSeriesCollectionConfiguration> = CaseInsensitiveKeysMap.create();
    public policyCheckFrequencyInMs: number;
    public namedValues: Map<string, Map<string, string[]>> = CaseInsensitiveKeysMap.create();

    public getNames(collection: string, timeSeries: string): string[] {
        if (!this.namedValues) {
            return null;
        }

        const timeSeriesHolder = this.namedValues.get(collection);
        if (!timeSeriesHolder) {
            return null;
        }

        const names = timeSeriesHolder.get(timeSeries);
        if (!names) {
            return null;
        }

        return names;
    }

    public serialize(): TimeSeriesConfigurationRaw {
        const collections: Record<string, TimeSeriesCollectionConfigurationRaw> = {};

        if (this.collections) {
            for (const entry of this.collections.entries()) {
                collections[entry[0]] = entry[1].serialize();
            }
        }

        const namedValues: Record<string, Record<string, string[]>> = {};

        if (this.namedValues) {
            for (const entry of this.namedValues.entries()) {
                const collectionEntry: Record<string, string[]> = {};

                for (const perCollectionEntry of entry[1].entries()) {
                    collectionEntry[perCollectionEntry[0]] = perCollectionEntry[1];
                }

                namedValues[entry[0]] = collectionEntry;
            }
        }

        return {
            Collections: collections,
            PolicyCheckFrequency: this.policyCheckFrequencyInMs ? TimeUtil.millisToTimeSpan(this.policyCheckFrequencyInMs) : null,
            NamedValues: namedValues
        }
    }

    // using handcrafted parse function as we need to customize parsing process + call after deserialize callbacks
    static parse(raw: TimeSeriesConfigurationRaw): TimeSeriesConfiguration {
        const configuration = new TimeSeriesConfiguration();

        for (const [key, collectionRaw] of Object.entries(raw.Collections)) {
            configuration.collections.set(key, TimeSeriesCollectionConfiguration.parse(collectionRaw));
        }
        configuration.policyCheckFrequencyInMs = raw.PolicyCheckFrequency ? TimeUtil.timeSpanToDuration(raw.PolicyCheckFrequency) : null;
        for (const [key, valuesRaw] of Object.entries(raw.NamedValues)) {
            const map = CaseInsensitiveKeysMap.create<string[]>();
            for (const [innerKey, innerValuesRaw] of Object.entries(valuesRaw)) {
                map.set(innerKey, innerValuesRaw);
            }
            configuration.namedValues.set(key, map);
        }

        return configuration;
    }
}

export interface TimeSeriesConfigurationRaw {
    Collections: Record<string, TimeSeriesCollectionConfigurationRaw>;
    PolicyCheckFrequency: string;
    NamedValues: Record<string, Record<string, string[]>>;
}
