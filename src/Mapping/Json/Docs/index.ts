export function getIgnoreKeyCaseTransformKeysFromDocumentMetadata(metadata: object): string[] {
    const nestedTypes = metadata["@nested-object-types"] as { [path: string]: string };
    if (typeof nestedTypes !== "object") {
        return [];
    }

    return Object.keys(nestedTypes)
        .reduce((reduceResult, next) => {
            // this is what this all fuss is about
            // when reviving Maps we cannot tinker with their keys
            if (nestedTypes[next] === "Map") {
                return reduceResult.concat(next);
            }

            return reduceResult;
        }, [] as string[]);
}
