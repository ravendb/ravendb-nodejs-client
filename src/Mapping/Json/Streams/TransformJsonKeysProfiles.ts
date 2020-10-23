import { CasingConvention } from "../../../Utility/ObjectUtil";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { throwError } from "../../../Exceptions";

export type TransformJsonKeysProfile = 
    "CommandResponsePayload"
    | "NoChange" 
    | "DocumentLoad"
    | "DocumentQuery"
    | "FacetQuery"
    | "Patch"
    | "CompareExchangeValue"
    | "GetCompareExchangeValue"
    | "SubscriptionResponsePayload"
    | "SubscriptionRevisionsResponsePayload";

function getSimpleKeysTransform(convention: CasingConvention) {
    return {
        getCurrentTransform(key: string, stack: (string | number | null)[]): CasingConvention {
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

        if (profile === "DocumentQuery") {
            if (!conventions) {
                throwError("InvalidArgumentException", "Document conventions are required for this profile.");
            }

            const getCurrentTransform = buildEntityKeysTransformForDocumentQuery(conventions.entityFieldNameConvention);
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

        if (profile === "GetCompareExchangeValue") {
            if (!conventions) {
                throwError("InvalidArgumentException", "Document conventions are required for this profile.");
            }

            return {
                getCurrentTransform:
                    buildEntityKeysTransformForGetCompareExchangeValue(conventions.entityFieldNameConvention)
            };
        }

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

function buildEntityKeysTransformForGetCompareExchangeValue(entityCasingConvention) {
    return function getCompareExchangeValueTransform(key, stack) {
        const len = stack.length;

        if (stack[0] === "Results") {
            if (stack[2] === "Value" && stack[3] === "@metadata") {
                return handleMetadataJsonKeys(key, stack, len, 4);
            }
        }

        if (len <= 4) {
            return "camel";
        }

        return entityCasingConvention;
    };
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

        return "camel";
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
            if (stack[0] === "CompareExchangeValueIncludes") {
                return "camel";
            }
            // top document level
            return key === "@metadata" ? null : entityCasingConvention;
        }

        if (len === 4) {
            if (stack[0] === "CompareExchangeValueIncludes" && stack[2] === "Value" && stack[3] === "Object") {
                return "camel";
            }
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

            if (stack[0] === "TimeSeriesIncludes") {
                return "camel";
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

        if (len === 7) {
            if (stack[0] === "TimeSeriesIncludes") {
                return "camel";
            }
        }

        return entityCasingConvention; 
    };
}

function buildEntityKeysTransformForDocumentQuery(entityCasingConvention) {
    return function entityKeysTransform(key, stack) {
        const len = stack.length;
        if (len === 1) {
            // Results, Includes, Timings...
            return "camel";
        }

        // len === 2 is array index
        if (stack[0] === "Results" || stack[0] === "Includes") {
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
        }

        if (len === 3) {
            if (stack[0] === "CompareExchangeValueIncludes") {
                return "camel";
            }
        }

        if (len === 4) {
            if (stack[0] === "CompareExchangeValueIncludes" && stack[2] === "Value" && stack[3] === "Object") {
                return "camel";
            }
        }

        if (stack[0] === "Timings") {
            return "camel";
        }

        return entityCasingConvention; 
    };
}

function handleMetadataJsonKeys(key: string, stack: string[], stackLength: number, metadataKeyLevel: number) {
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
