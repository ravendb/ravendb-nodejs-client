import { CasingConvention } from "../../../Utility/ObjectUtil";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { throwError } from "../../../Exceptions";

export type TransformJsonKeysProfile =
    "SubscriptionResponsePayload"
    | "SubscriptionRevisionsResponsePayload";


export function getTransformJsonKeysProfile(
    profile: TransformJsonKeysProfile, conventions?: DocumentConventions): { getCurrentTransform: (key: any, stack: any) => CasingConvention } {
        if (profile === "SubscriptionResponsePayload") {
            if (!conventions) {
                throwError("InvalidArgumentException", "Document conventions are required for this profile.");
            }

            return {
                getCurrentTransform:
                    buildEntityKeysTransformForSubscriptionResponsePayload(conventions.entityFieldNameConvention)
            };
        }

        if (profile === "SubscriptionRevisionsResponsePayload") {
            if (!conventions) {
                throwError("InvalidArgumentException", "Document conventions are required for this profile.");
            }

            return {
                getCurrentTransform:
                    buildEntityKeysTransformForSubscriptionRevisionsResponsePayload(
                        conventions.entityFieldNameConvention)
            };
        }

        throwError("NotSupportedException", `Invalid profile name ${profile}`);
}

function buildEntityKeysTransformForSubscriptionResponsePayload(entityCasingConvention) {
    return function entityKeysTransform(key, stack) {
        const len = stack.length;
        if (len === 1) {
            // type, Includes
            return "camel";
        }

        if (stack[0] === "Data") {
            if (stack[1] === "@metadata") {
                return handleMetadataJsonKeys(key, stack, len, 2);
            }

            return entityCasingConvention;
        } else if (stack[0] === "Includes") {

            if (stack[2] === "@metadata") {
                return handleMetadataJsonKeys(key, stack, len, 2);
            }

            return entityCasingConvention;
        } else if (stack[0] === "CounterIncludes") {
            if (len === 2) {
                return null;
            }
        } else if (stack[0] === "IncludedCounterNames") {
            if (len === 2) {
                return null;
            }
        }

        return "camel";
    };
}

function buildEntityKeysTransformForSubscriptionRevisionsResponsePayload(entityCasingConvention) {
    return function entityKeysTransform(key, stack) {
        const len = stack.length;
        if (len === 1) {
            // type, Includes
            return "camel";
        }

        const isData = stack[0] === "Data";
        if (isData && stack[1] === "@metadata") {
            return handleMetadataJsonKeys(key, stack, len, 2);
        }

        if (isData && (stack[1] === "Current" || stack[1] === "Previous")) {
            if (len === 2) {
                return "camel";
            }

            if (stack[2] === "@metadata") {
                return handleMetadataJsonKeys(key, stack, len, 3);
            }

            return entityCasingConvention;
        }

        if (stack[0] === "CounterIncludes") {
            if (len === 2) {
                return null;
            }
        }

        return "camel";
    };
}


function handleMetadataJsonKeys(key: string, stack: string[], stackLength: number, metadataKeyLevel: number): CasingConvention {
    if (stackLength === metadataKeyLevel) {
        return null; // don't touch @metadata key
    }

    if (stackLength === metadataKeyLevel + 1) {
        if (key[0] === "@" || key === "Raven-Node-Type") {
            return null;
        }
    }

    if (stackLength === metadataKeyLevel + 2) {
        // do not touch @nested-object-types keys
        if (stack[stackLength - 2] === "@nested-object-types") {
            return null;
        }
    }

    if (stackLength === metadataKeyLevel + 3) {
        // @metadata.@attachments.[].name
        // metadataKeyLevel starts at 1, thus we do -1 to get index
        if (stack[metadataKeyLevel - 1] === "@metadata") {
            if (stack[metadataKeyLevel - 1 + 1] === "@attachments") {
                return "camel";
            }

            return null;
        }
    }

    return null;
}
