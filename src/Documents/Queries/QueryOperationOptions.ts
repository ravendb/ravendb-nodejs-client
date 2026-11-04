export interface QueryOperationOptions {
    maxOpsPerSecond: number;
    allowStale: boolean;
    /**
     * Ignore the maximum number of statements a script can execute as defined in the server configuration.
     */
    ignoreMaxStepsForScript?: boolean;
    staleTimeout: number;
    retrieveDetails: boolean;
    /**
     * Wait for indexes to catch up with the documents changed by the operation before it completes.
     */
    indexPatchOptions?: IndexPatchOptions;
}

export interface IndexPatchOptions {
    /**
     * Maximum time in milliseconds to wait for the indexes to become non-stale. Defaults to 15 seconds.
     */
    waitForIndexesTimeout?: number;
    /**
     * Fail the operation when the timeout is reached instead of completing normally.
     */
    throwOnTimeoutInWaitForIndexes?: boolean;
    /**
     * Index names to wait for. When not set, the server waits for the indexes affected by the changed documents.
     */
    waitForSpecificIndexes?: string[];
}
