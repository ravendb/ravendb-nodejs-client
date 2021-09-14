import { IQueryBase } from "./IQueryBase";
import { IDocumentQueryBaseSingle } from "../Session/IDocumentQueryBaseSingle";
import { IEnumerableQuery } from "../Session/IEnumerableQuery";
import { FacetResult } from "../Queries/Facets";

export interface IRawDocumentQuery<T extends object>
    extends IQueryBase<T, IRawDocumentQuery<T>>, IDocumentQueryBaseSingle<T>, IEnumerableQuery<T> {

    /**
     * Add a named parameter to the query
     */
    addParameter(name: string, value: any): IRawDocumentQuery<T>;

    /**
     * Execute raw query aggregated by facet
     */
    executeAggregation(): Promise<Record<string, FacetResult>>;
}
