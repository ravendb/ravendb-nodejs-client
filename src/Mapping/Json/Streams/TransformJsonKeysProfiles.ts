import { CasingConvention } from "../../../Utility/ObjectUtil";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { throwError } from "../../../Exceptions";

export type TransformJsonKeysProfile = 
    "CommandResponsePayload"
    | "NoChange" 
    | "DocumentLoad"
    | "FacetQuery"
    | "Patch"
    | "CompareExchangeValue";

function getSimpleKeysTransform(convention: CasingConvention) {
    return {
        getCurrentTransform(key: string, stack: Array<string | number | null>): CasingConvention {
            return convention;
        }
    };
}

export function getTransformJsonKeysProfile(
    profile: TransformJsonKeysProfile, conventions?: DocumentConventions) {
        if (profile === "CommandResponsePayload") {
            return getSimpleKeysTransform("camel");
        }

        if (profile === "NoChange") {
            return getSimpleKeysTransform(null);
        }

        if (profile === "DocumentLoad") {
            if (!conventions) {
                throwError("InvalidArgumentException", "Document conventions are required for this profile.");
            }

            const getCurrentTransform = buildEntityKeysTransformForDocumentLoad(conventions.entityFieldNameConvention);
            return { getCurrentTransform };
        }

        if (profile === "FacetQuery") {
            return {
                getCurrentTransform: facetQueryGetTransform
            };
        }

        if (profile === "Patch") {
            if (!conventions) {
                throwError("InvalidArgumentException", "Document conventions are required for this profile.");
            }

            return { 
                getCurrentTransform: 
                    buildEntityKeysTransformForPatch(conventions.entityFieldNameConvention) 
            };
        }

        if (profile === "CompareExchangeValue") {
            if (!conventions) {
                throwError("InvalidArgumentException", "Document conventions are required for this profile.");
            }

            return {
                getCurrentTransform:
                    buildEntityKeysTransformForPutCompareExchangeValue(conventions.entityFieldNameConvention)
            };
        }

        throwError("NotSupportedException", `Invalid profile name ${profile}`);
}

function facetQueryGetTransform(key, stack) {
    return "camel";
}

function buildEntityKeysTransformForPatch(entityCasingConvention) {
    return function entityKeysTransform(key, stack) {
        const len = stack.length;
        if (len === 1) {
            return "camel";
        }

        const isDoc = stack[0] === "OriginalDocument" || stack[0] === "ModifiedDocument";
        if (isDoc) {
            if (len === 2) {
                // top document level
                return key === "@metadata" ? null : entityCasingConvention;
            }

            if (len === 3) {
                if (stack[1] === "@metadata") {
                    // handle @metadata object keys
                    if (key[0] === "@" || key === "Raven-Node-Type") {
                        return null;
                    }
                }
            }

            if (len === 4) {
                // do not touch @nested-object-types keys
                if (stack[len - 2] === "@nested-object-types") {
                    return null;
                }
            }

            if (len === 5) {
                // @metadata.@attachments.[].name
                if (stack[1] === "@metadata") {
                    if (stack[2] === "@attachments") {
                        return "camel";
                    }

                    return null;
                }
            }

            return entityCasingConvention;
        }

        return "camel";
    };
}

function buildEntityKeysTransformForPutCompareExchangeValue(entityCasingConvention) {
    return function compareExchangeValueTransform(key, stack) {
        const len = stack.length;
        if (len === 1 || len === 2) {
            // Results, Includes
            return "camel";
        }

        // len === 2 is array index

        if (len === 3) {
            // top document level
            return key === "@metadata" ? null : entityCasingConvention;
        }

        if (len === 4) {
            if (stack[2] === "@metadata") {
                // handle @metadata object keys
                if (key[0] === "@" || key === "Raven-Node-Type") {
                    return null;
                }
            }
        }

        if (len === 5) {
            // do not touch @nested-object-types keys
            if (stack[len - 2] === "@nested-object-types") {
                return null;
            }
        }

        if (len === 6) {
            // @metadata.@attachments.[].name
            if (stack[2] === "@metadata") {
                 if (stack[3] === "@attachments") {
                     return "camel";
                 }

                 return null;
            }
        }

        return entityCasingConvention; 
    };
}

function buildEntityKeysTransformForDocumentLoad(entityCasingConvention) {
    return function entityKeysTransform(key, stack) {
        const len = stack.length;
        if (len === 1) {
            // Results, Includes
            return "camel";
        }

        // len === 2 is array index

        if (len === 3) {
            // top document level
            return key === "@metadata" ? null : entityCasingConvention;
        }

        if (len === 4) {
            if (stack[2] === "@metadata") {
                // handle @metadata object keys
                if (key[0] === "@" || key === "Raven-Node-Type") {
                    return null;
                }
            }
        }

        if (len === 5) {
            // do not touch @nested-object-types keys
            if (stack[len - 2] === "@nested-object-types") {
                return null;
            }
        }

        if (len === 6) {
            // @metadata.@attachments.[].name
            if (stack[2] === "@metadata") {
                 if (stack[3] === "@attachments") {
                     return "camel";
                 }

                 return null;
            }
        }

        return entityCasingConvention; 
    };
}
