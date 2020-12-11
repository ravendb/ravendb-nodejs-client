import { RawTimeSeriesPolicy } from "./RawTimeSeriesPolicy";
import { ConfigureTimeSeriesPolicyOperation } from "./ConfigureTimeSeriesPolicyOperation";

export class ConfigureRawTimeSeriesPolicyOperation extends ConfigureTimeSeriesPolicyOperation {
    public constructor(collection: string, config: RawTimeSeriesPolicy) {
        super(collection, config);
    }
}
