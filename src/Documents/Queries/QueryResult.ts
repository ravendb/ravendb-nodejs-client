import { GenericQueryResult } from "./GenericQueryResult";

export class QueryResult extends GenericQueryResult<object[], object> {

    /**
     * Creates a snapshot of the query results
     * @return returns snapshot of query result
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

        /* TBD 4.1
        Map<String, Map<String, List<String>>> highlightings = getHighlightings();

        if (highlightings != null) {
            Map<String, Map<String, List<String>>> newHighlights = new HashMap<>();
            for (Map.Entry<String, Map<String, List<String>>> hightlightEntry : getHighlightings().entrySet()) {
                newHighlights.put(hightlightEntry.getKey(), new HashMap<>(hightlightEntry.getValue()));
            }
            queryResult.setHighlightings(highlightings);
        }*/

        if (this.scoreExplanations) {
            queryResult.scoreExplanations = Object.assign({}, queryResult.scoreExplanations);
        }

        if (this.timingsInMs) {
            queryResult.timingsInMs = Object.assign({}, queryResult.timingsInMs);
        }

        queryResult.lastQueryTime = this.lastQueryTime;
        queryResult.durationInMs = this.durationInMs;
        queryResult.resultEtag = this.resultEtag;
        return queryResult;
    }
}
