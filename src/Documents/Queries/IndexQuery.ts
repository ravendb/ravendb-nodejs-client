import { throwError } from "../../Exceptions";
import { IndexQueryWithParameters } from "./IndexQueryWithParameters";
import { QueryHashCalculator } from "./QueryHashCalculator";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { JsonSerializer } from "../../Mapping/Json/Serializer";

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
            hasher.write(this.query);
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

export function writeIndexQuery(conventions: DocumentConventions, indexQuery: IndexQuery): string {
    const result = {
        Query: indexQuery.query
    };

    if (indexQuery.pageSizeSet && indexQuery.pageSize >= 0) {
        result["PageSize"] = indexQuery.pageSize;
    }

    if (indexQuery.waitForNonStaleResults) {
        result["WaitForNonStaleResults"] = indexQuery.waitForNonStaleResults;
    }

    if (indexQuery.start > 0) {
        result["Start"] = indexQuery.start;
    }

    if (!TypeUtil.isNullOrUndefined(indexQuery.waitForNonStaleResultsTimeout)) {
        result["WaitForNonStaleResultsTimeout"] = indexQuery.waitForNonStaleResultsTimeout;
    }

    if (indexQuery.disableCaching) {
        result["DisableCaching"] = indexQuery.disableCaching;
    }

    /* TBD
    if (query.isExplainScores()) {
        generator.writeBooleanField("ExplainScores", query.isExplainScores());
    }*/

    /* TBD
    if (query.isShowTimings()) {
        generator.writeBooleanField("ShowTimings", query.isShowTimings());
    }*/

    if (indexQuery.skipDuplicateChecking) {
        result["SkipDuplicateChecking"] = indexQuery.skipDuplicateChecking;
    }

    if (!indexQuery.queryParameters) {
        result["QueryParameters"] = null;
    } else {
        result["QueryParameters"] = indexQuery.queryParameters;
    }

    return JsonSerializer.getDefault().serialize(result);
}
