import { IndexDefinition } from "../IndexDefinition";
import { IndexSourceType } from "../IndexSourceType";

export class TimeSeriesIndexDefinition extends IndexDefinition {
    get sourceType(): IndexSourceType {
        return "TimeSeries";
    }
}