import { IIndexQuery } from "./IIndexQuery.js";
import { ProjectionBehavior } from "./ProjectionBehavior.js";

export class IndexQueryBase<T> implements IIndexQuery {

    public query: string;
    public queryParameters: T;
    public projectionBehavior: ProjectionBehavior;
    public waitForNonStaleResults: boolean;
    public waitForNonStaleResultsTimeout: number;

    /**
     * User-defined query tag. Sent to the server as the `tag` query-string parameter.
     * Useful for identifying query sources in server logs and monitoring.
     */
    public tag?: string;

}
