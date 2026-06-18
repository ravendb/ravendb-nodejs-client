export type OrderingType =
    "String" |
    "Long" |
    "Double" |
    "AlphaNumeric";

/**
 * Controls where null values appear in ORDER BY results.
 * "First" and "Last" are supported only by the Corax indexing engine.
 * Queries targeting a Lucene index that specify "First" or "Last" are rejected by the server.
 */
export type NullsOrdering = "Default" | "First" | "Last";
