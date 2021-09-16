
export type ProjectionBehavior =
    /**
     * Try to extract value from index field (if field value is stored in index),
     * on a failure (or when field value is not stored in index) extract value from a document
     */
    "Default"
    /**
     * Try to extract value from index field (if field value is stored in index), on a failure skip field
     */
    | "FromIndex"
    /**
     * Extract value from index field or throw
     */
    | "FromIndexOrThrow"
    /**
     * Try to extract value from document field, on a failure skip field
     */
    | "FromDocument"
    /**
     * Extract value from document field or throw
     */
    | "FromDocumentOrThrow"
    ;