import { throwError } from "../../../Exceptions/index.js";

/**
 * Normalizes replication path filter arrays: trims whitespace from each entry,
 * drops empty/whitespace-only entries, and validates wildcard syntax.
 *
 * Returns undefined when the input is undefined/null or all entries are empty after trimming.
 */
export function normalizePaths(paths?: string[]) {
    if (!paths) {
        return undefined;
    }

    const normalized = paths
        .map(path => path?.trim())
        .filter((path) => !!path && path.length > 0);

    for (const path of normalized) {
        if (path[path.length - 1] === "*") {
            const prev = path[path.length - 2];
            if (path.length > 1 && prev !== "/" && prev !== "-") {
                throwError("InvalidOperationException",
                    `When using '*' at the end of the allowed path, the previous character must be '/' or '-', but got: ${path}`);
            }
        }
    }

    return normalized.length > 0 ? normalized : undefined;
}
