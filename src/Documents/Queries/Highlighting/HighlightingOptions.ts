export interface HighlightingOptions {
    groupKey?: string;
    preTags?: string[];
    postTags?: string[];
}

export function extractHighlightingOptionsFromParameters(hightlightingParameters: object) {
    return Object.keys(hightlightingParameters)
        .reduce((result, key) => {
            if (key === "groupKey" as keyof HighlightingOptions
                || key === "preTags" as keyof HighlightingOptions
                || key === "postTags" as keyof HighlightingOptions) {
                result[key] = hightlightingParameters[key];
            }

            return result;
        }, {});
}
