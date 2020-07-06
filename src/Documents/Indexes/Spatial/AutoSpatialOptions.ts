import { AutoSpatialMethodType } from "../Enums";
import { SpatialOptions } from "../Spatial";

export interface AutoSpatialOptions extends SpatialOptions {
    methodType: AutoSpatialMethodType;
    methodArguments: string[];
}