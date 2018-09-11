import { QueryResultBase } from "./QueryResultBase";

export class GenericQueryResult<TResult, TIncludes> extends QueryResultBase<TResult, TIncludes> {

    public totalResults: number;
    public skippedResults: number;
    // TBD 4.1 private Map<String, Map<String, List<String>>> highlightings;
    public durationInMs: number;
    public scoreExplanations: { [key: string]: string };
    public timingsInMs: { [key: string]: number };
    public resultSize: number;
}
