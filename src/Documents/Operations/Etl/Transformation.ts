import { DocumentConventions } from "../../..";
import { getTransformJsonKeysProfile } from "../../../Mapping/Json/Streams/TransformJsonKeysProfiles";

export class Transformation {
    name: string;
    disabled?: boolean;
    collections?: string[];
    applyToAllDocuments?: boolean;
    script?: string;
}

export function serializeTransformation(transformation: Transformation) {
    return {
        Name: transformation.name,
        Disabled: transformation.disabled,
        Collections: transformation.collections,
        ApplyToAllDocuments: transformation.applyToAllDocuments,
        Script: transformation.script
    }
}