import { QueryResultBase } from "./QueryResultBase";

export interface QueryResultHighlightings { 
    [key: string]: { [key: string]: string[] };
} 

export interface QueryResultExplanations {
    [key: string]: string[];
}

export class GenericQueryResult<TResult, TIncludes> extends QueryResultBase<TResult, TIncludes> {

    public totalResults: number;
    public skippedResults: number;
    public highlightings: QueryResultHighlightings;
    public explanations: QueryResultExplanations;
    public durationInMs: number;
    public scoreExplanations: { [key: string]: string };
    public timingsInMs: { [key: string]: number };
    /**
     * @deprecated ResultSize is not supported anymore. Will be removed in next major version of the product.
     */
    public resultSize: number;
}
