export type IndexState = 
    "NORMAL" 
    | "DISABLED" 
    | "IDLE" 
    | "ERROR";

export type IndexType = 
    "None" 
    | "AUTO_MAP" 
    | "AUTO_MAP_REDUCE" 
    | "MAP"
    | "MAP_REDUCE"
    | "FAULTY";
    
export type FieldStorage = "YES" | "NO";

export type FieldIndexing =     
    /**
     * Do not index the field value. 
     * This field can thus not be searched, but one can still access its contents provided it is stored.
     */
    "NO" 
    /**
     * Index the tokens produced by running the field's value through an Analyzer. This is useful for common text.
     */
    | "SEARCH"

    /**
     * Index the field's value without using an Analyzer, so it can be searched.  As no analyzer is used the
     * value will be stored as a single term. This is useful for unique Ids like product numbers.
     */
    | "EXACT"

    /**
     *  Index this field using the default internal analyzer: LowerCaseKeywordAnalyzer
     */
    | "DEFAULT"; 

export type FieldTermVector =
    /**
     * Do not store term vectors
     */
    "NO"
    /**
     * Store the term vectors of each document. A term vector is a list of the document's
     * terms and their number of occurrences in that document.
     */
    | "YES"
    /**
     * Store the term vector + token position information
     */
    | "WITH_POSITIONS"
    /**
     * Store the term vector + Token offset information
     */
    | "WITH_OFFSETS"
    /**
     * Store the term vector + Token position and offset information
     */
    | "WITH_POSITIONS_AND_OFFSETS";

export type IndexPriority = 
    "LOW"
    | "NORMAL"
    | "HIGH";

export type IndexLockMode = 
    "UNLOCK"
    | "LOCKED_IGNORE" 
    | "LOCKED_ERROR";
