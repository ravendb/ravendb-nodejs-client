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
    | "Faulty";
    
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
