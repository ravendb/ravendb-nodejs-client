export type BuiltinStartingPoints =
    | "DoNotChange"
    | "LastDocument"
    | "BeginningOfTime";

export type StartingPointChangeVectorType =
    | BuiltinStartingPoints
    | (string & {});

/**
 * Represents a starting point for ETL processing, indicating where the ETL task should begin processing documents.
 *
 * Provides predefined starting points:
 * - LastDocument: Start from the last processed document
 * - BeginningOfTime: Start from the beginning of the collection
 * - DoNotChange: Keep the current starting point when updating
 */
export class StartingPointChangeVector {
    /**
     * Indicates that the ETL starting point should not be changed during an update operation.
     */
    public static readonly DoNotChange = new StartingPointChangeVector("DoNotChange");
    /**
     * Indicates that the ETL should start from the last processed document.
     */
    public static readonly LastDocument = new StartingPointChangeVector("LastDocument");
    /**
     * Indicates that the ETL should start from the beginning of time (process all documents from the start).
     */
    public static readonly BeginningOfTime = new StartingPointChangeVector("BeginningOfTime");

    private constructor(public value: StartingPointChangeVectorType) {
    }

    /**
     * Creates a StartingPointChangeVector from a specific change vector string.
     * @param changeVector The change vector string
     * @returns A new StartingPointChangeVector instance
     */
    public static from(changeVector: StartingPointChangeVectorType): StartingPointChangeVector {
        return new StartingPointChangeVector(changeVector);
    }
}

