export type IndexState =
    "Normal"
    | "Disabled"
    | "Idle"
    | "Error";

export type IndexType =
    "None"
    | "AutoMap"
    | "AutoMapReduce"
    | "Map"
    | "MapReduce"
    | "Faulty"
    | "JavaScriptMap"
    | "JavaScriptMapReduce";

export type FieldStorage = "Yes" | "No";

export type FieldIndexing =
    /**
     * Do not index the field value.
     * This field can thus not be searched, but one can still access its contents provided it is stored.
     */
    "No"
    /**
     * Index the tokens produced by running the field's value through an Analyzer. This is useful for common text.
     */
    | "Search"

    /**
     * Index the field's value without using an Analyzer, so it can be searched.  As no analyzer is used the
     * value will be stored as a single term. This is useful for unique Ids like product numbers.
     */
    | "Exact"

    /**
     * Index the tokens produced by running the field's value through an Analyzer (same as Search),
     * store them in index and track term vector positions and offsets. This is mandatory when highlighting is used.
     */
    | "Highlighting"

    /**
     *  Index this field using the default internal analyzer: LowerCaseKeywordAnalyzer
     */
    | "Default";

export type FieldTermVector =
    /**
     * Do not store term vectors
     */
    "No"
    /**
     * Store the term vectors of each document. A term vector is a list of the document's
     * terms and their number of occurrences in that document.
     */
    | "Yes"
    /**
     * Store the term vector + token position information
     */
    | "WithPositions"
    /**
     * Store the term vector + Token offset information
     */
    | "WithOffsets"
    /**
     * Store the term vector + Token position and offset information
     */
    | "WithPositionsAndOffsets";

export type IndexPriority =
    "Low"
    | "Normal"
    | "High";

export type IndexLockMode =
    "Unlock"
    | "LockedIgnore"
    | "LockedError";


export type AggregationOperation =
    "None"
    | "Count"
    | "Sum";

export type AutoFieldIndexing =
    "No"
    | "Search"
    | "Exact"
    | "Highighting"
    | "Default";

export type GroupByArrayBehavior =
    "NotApplicable"
    | "ByContent"
    | "ByIndividualValues";

export type AutoSpatialMethodType =
    "Point"
    | "Wkt";

/**
 * Represents enum mapping in index definition
 * ex. Role.Admin -> "admin"
 *     (sourceCode)  (actualValue)
 */
export interface EnumMapping {
    sourceCode: string;
    actualValue: string | number;
}
