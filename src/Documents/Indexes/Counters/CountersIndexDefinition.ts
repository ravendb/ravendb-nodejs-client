import { IndexDefinition } from "../IndexDefinition";
import { IndexSourceType } from "../IndexSourceType";

export class CountersIndexDefinition extends IndexDefinition {

    public get sourceType(): IndexSourceType {
        return "Counters";
    }
}