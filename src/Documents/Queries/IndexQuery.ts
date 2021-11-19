import { throwError } from "../../Exceptions";
import { IndexQueryWithParameters } from "./IndexQueryWithParameters";
import { HashCalculator } from "./HashCalculator";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { JsonSerializer } from "../../Mapping/Json/Serializer";
import { TypesAwareObjectMapper } from "../../Mapping/ObjectMapper";

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
     */
    public disableCaching: boolean;

    public getQueryHash(mapper: TypesAwareObjectMapper): string {
        const hasher = new HashCalculator();
        try {
            hasher.write(this.query, mapper);
            hasher.write(this.waitForNonStaleResults);
            hasher.write(this.skipDuplicateChecking);
            hasher.write(this.waitForNonStaleResultsTimeout || 0);
            hasher.write(this.start);
            hasher.write(this.pageSize);
            hasher.write(this.queryParameters, mapper);
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
