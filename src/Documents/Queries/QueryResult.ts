import { GenericQueryResult } from "./GenericQueryResult";

export class QueryResult extends GenericQueryResult<object[], object> {

    /**
     * Creates a snapshot of the query results
     */
    public createSnapshot(): QueryResult {
        const queryResult = new QueryResult();
        queryResult.results = this.results;
        queryResult.includes = this.includes;
        queryResult.indexName = this.indexName;
        queryResult.indexTimestamp = this.indexTimestamp;
        queryResult.includedPaths = this.includedPaths;
        queryResult.isStale = this.isStale;
        queryResult.skippedResults = this.skippedResults;
        queryResult.totalResults = this.totalResults;
        queryResult.highlightings = this.highlightings;
        queryResult.explanations = this.explanations;
        queryResult.timingsInMs = this.timingsInMs;
        queryResult.lastQueryTime = this.lastQueryTime;
        queryResult.durationInMs = this.durationInMs;
        queryResult.resultEtag = this.resultEtag;
        queryResult.nodeTag = this.nodeTag;
        queryResult.counterIncludes = this.counterIncludes;
        queryResult.includedCounterNames = this.includedCounterNames;
        queryResult.timeSeriesIncludes = this.timeSeriesIncludes;
        queryResult.compareExchangeValueIncludes = this.compareExchangeValueIncludes;
        queryResult.timeSeriesFields = this.timeSeriesFields;
        return queryResult;
    }
}
