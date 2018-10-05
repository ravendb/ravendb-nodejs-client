import { CONSTANTS } from "../../../Constants";
import { getIgnoreKeyCaseTransformKeysFromDocumentMetadata } from "../Docs";
import { CasingConvention } from "../../../Utility/ObjectUtil";
import {
    ObjectKeyCaseTransformStreamOptionsBase,
    ObjectKeyCaseTransformStreamOptions
} from "../Streams/ObjectKeyCaseTransformStream";

export const DOCUMENT_LOAD_KEY_CASE_TRANSFORM_PROFILE: ObjectKeyCaseTransformStreamOptionsBase = {
    ignorePaths: [ CONSTANTS.Documents.Metadata.IGNORE_CASE_TRANSFORM_REGEX ],
    ignoreKeys: [/^@/],
    paths: [
        {
            transform: "camel",
            path: /@metadata\.@attachments/
        }
    ]
};

export const MULTI_GET_KEY_CASE_TRANSFORM_PROFILE: ObjectKeyCaseTransformStreamOptionsBase = {
    ignorePaths: [/^headers\./i]
};

export type ObjectKeyCaseTransformProfile =
    "DOCUMENT_LOAD"
    | "DOCUMENT_QUERY";

export function getObjectKeyCaseTransformProfile(
    defaultTransform: CasingConvention, profile?: ObjectKeyCaseTransformProfile): ObjectKeyCaseTransformStreamOptions {
    switch (profile) {
        case "DOCUMENT_LOAD":
        case "DOCUMENT_QUERY":
            return Object.assign({ defaultTransform }, DOCUMENT_LOAD_KEY_CASE_TRANSFORM_PROFILE);
        default:
            return { defaultTransform };
    }
}
