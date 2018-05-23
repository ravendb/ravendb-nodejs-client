export type PatchStatus =

    /**
     * The document does not exists, operation was a no-op
     */
    "DocumentDoesNotExist"

    /**
     * The document did not exist, but patchIfMissing was specified and new document was created
     */
    | "Created"

    /**
     * The document was properly patched
     */
    | "Patched"

    /**
     * The document was not patched, because skipPatchIfChangeVectorMismatch was set and the etag did not match
     */
    | "Skipped"

    /**
     * Neither document body not metadata was changed during patch operation
     */
    | "NotModified";
