export interface QueryOperationOptions {
    maxOpsPerSecond: number;
    allowStale: boolean;
    /**
     * Ignore the maximum number of statements a script can execute as defined in the server configuration.
     */
    ignoreMaxStepsForScript?: boolean;
    staleTimeout: number;
    retrieveDetails: boolean;
}
