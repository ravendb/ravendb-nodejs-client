import { ObjectUtil } from "../../../Utility/ObjectUtil.js";
import { ObjectKeyCaseTransformStreamOptions } from "../../../Mapping/Json/Streams/ObjectKeyCaseTransformStream.js";

/**
 * Key-case transform for certificate read responses.
 *
 * The `permissions` map is keyed by database names, which must be read back verbatim: the default
 * deep camelCasing would lowercase the first letter of each key (e.g. "UPPER_db" -> "uPPER_db"),
 * breaking case-sensitive permission matching on the server (RDBC-1085). We ignore those keys while
 * still camelCasing every other response field. Database names may contain '.', so the ignore path
 * matches everything under `permissions` (the values are primitive strings, so there is no nesting
 * below the key that would need transforming).
 *
 * Shared by all certificate read operations so their handling of permission keys can't drift.
 * The `results.[]` path prefix is coupled to the array-wrapped response shape those operations all
 * rely on; an operation returning permissions at a different path would need its own transform.
 */
export const CERTIFICATE_RESPONSE_KEY_CASE_TRANSFORM: ObjectKeyCaseTransformStreamOptions = {
    defaultTransform: ObjectUtil.camel,
    ignorePaths: [/^results\.\[\]\.permissions\..+$/i]
};
