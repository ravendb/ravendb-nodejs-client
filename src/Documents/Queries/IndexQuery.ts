import { throwError } from "../../Exceptions";
import { IndexQueryWithParameters } from "./IndexQueryWithParameters";
import { QueryHashCalculator } from "./QueryHashCalculator";

export interface IndexQueryParameters {
    [key: string]: object;
}

export class IndexQuery extends IndexQueryWithParameters<IndexQueryParameters> {

    public constructor();
    public constructor(query?: string);
    public constructor(query?: string) {
        super();
        this.query = query;
    }

    /**
     * Indicates if query results should be read from cache (if cached previously) 
     * or added to cache (if there were no cached items prior)
     * @return true if caching was disabled
     */
    public disableCaching: boolean;

    public getQueryHash(): string {
        const hasher = new QueryHashCalculator();
        try {
            hasher.write(this.query)
            hasher.write(this.waitForNonStaleResults);
            hasher.write(this.skipDuplicateChecking);
            //TBD hasher.write(isShowTimings());
            //TBD hasher.write(isExplainScores());
            hasher.write(this.waitForNonStaleResultsTimeout || 0);
            hasher.write(this.start);
            hasher.write(this.pageSize);
            hasher.write(this.queryParameters);
            return hasher.getHash();
        } catch (err) {
            throwError("RavenException", "Unable to calculate hash", err);
        }
    }
}
