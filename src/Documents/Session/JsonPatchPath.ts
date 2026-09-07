/**
 * Turns the JavaScript-style paths accepted by session.advanced.patch() / patchArray() / patchObject()
 * ("address.city", "tags[1]", "stuff[0].key") into RFC 6901 JSON pointers ("/address/city", "/tags/1", "/stuff/0/key").
 *
 * Grammar: identifier ( "." identifier | "[" integer "]" )*, identifier = [A-Za-z_$][A-Za-z0-9_$]*.
 * Anything else (quotes, expressions, whitespace) yields null so the caller keeps the JavaScript patch.
 */

export interface JsonPointerInfo {
    /** RFC 6901 pointer, e.g. "/stuff/0/key" */
    pointer: string;
    /** true when the last segment is an array index ("tags[1]"), false for a named member ("address.city") */
    endsWithIndex: boolean;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*/;
const INDEX = /^\[(0|[1-9][0-9]*)\]/;

export function escapeJsonPointerSegment(segment: string): string {
    return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * The server-side JsonPatchCommand.Parse rejects whitespace-only path segments.
 * Keys that would produce such segments must stay on the JavaScript path.
 */
export function isValidJsonPointerSegment(segment: string | null | undefined): boolean {
    return segment != null && segment.trim().length > 0;
}

export function tryBuildJsonPointer(path: string): JsonPointerInfo | null {
    if (!path) {
        return null;
    }

    const segments: string[] = [];
    let rest = path;
    let endsWithIndex = false;
    let expectIdentifier = true; // a path must start with an identifier, and one must follow every "."

    while (rest.length > 0) {
        if (expectIdentifier) {
            const identifier = IDENTIFIER.exec(rest);
            if (!identifier) {
                return null;
            }

            // identifiers cannot contain "~" or "/" (see IDENTIFIER), escaping only keeps segments uniform with dictionary keys
            segments.push(escapeJsonPointerSegment(identifier[0]));
            rest = rest.substring(identifier[0].length);
            endsWithIndex = false;
            expectIdentifier = false;
            continue;
        }

        if (rest.startsWith(".")) {
            rest = rest.substring(1);
            expectIdentifier = true;
            continue;
        }

        const index = INDEX.exec(rest);
        if (!index) {
            return null;
        }

        segments.push(index[1]);
        rest = rest.substring(index[0].length);
        endsWithIndex = true;
    }

    if (expectIdentifier) {
        // trailing "." (or nothing consumed)
        return null;
    }

    return { pointer: "/" + segments.join("/"), endsWithIndex };
}

/**
 * Mirrors the C# client: only null and JSON primitives travel as JsonPatch values.
 * Objects, arrays and Dates keep using JavaScript patches, whose arguments go through
 * the store's serialization conventions (PatchRequest.serialize()).
 */
export function canUseJsonPatchValue(value: unknown): boolean {
    if (value === null) {
        return true;
    }

    switch (typeof value) {
        case "string":
        case "boolean":
            return true;
        case "number":
            return Number.isFinite(value);
        default:
            return false;
    }
}
