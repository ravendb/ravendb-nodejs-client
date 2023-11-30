import { IQueryBase } from "./IQueryBase";
import { IDocumentQueryBaseSingle } from "./IDocumentQueryBaseSingle";
import { IEnumerableQuery } from "./IEnumerableQuery";
import { FacetResult } from "../Queries/Facets";
import { ProjectionBehavior } from "../Queries/ProjectionBehavior";

export interface IRawDocumentQuery<T extends object>
    extends IQueryBase<T, IRawDocumentQuery<T>>, IDocumentQueryBaseSingle<T>, IEnumerableQuery<T> {

    /**
     * Add a named parameter to the query
     */
    addParameter(name: string, value: any): IRawDocumentQuery<T>;

    projection(projectionBehavior: ProjectionBehavior): IRawDocumentQuery<T>;

    /**
     * Execute raw query aggregated by facet
     */
    executeAggregation(): Promise<Record<string, FacetResult>>;
}
