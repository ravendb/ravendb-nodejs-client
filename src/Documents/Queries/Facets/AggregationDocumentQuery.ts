import { AggregationQueryBase } from "./AggregationQueryBase";
import { FacetBase } from "./FacetBase";
import { IAggregationDocumentQuery } from "./IAggregationDocumentQuery";
import { DocumentQuery } from "../../Session/DocumentQuery";
import { AbstractDocumentQuery } from "../../Session/AbstractDocumentQuery";
import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations";
import { IFacetBuilder } from "./IFacetBuilder";
import { FacetBuilder } from "./FacetBuilder";
import { IndexQuery } from "../IndexQuery";
import { QueryResult } from "../QueryResult";

export class AggregationDocumentQuery<T extends object> extends AggregationQueryBase
    implements IAggregationDocumentQuery<T> {

    private _source: AbstractDocumentQuery<T, DocumentQuery<T>>;

    public constructor(source: DocumentQuery<T>) {
        super(source.session as any as InMemoryDocumentSessionOperations);
        this._source = source;
    }

    public andAggregateBy(facet: FacetBase): IAggregationDocumentQuery<T>;
    public andAggregateBy(builder: (facetBuilder: IFacetBuilder<T>) => void): IAggregationDocumentQuery<T>;
    public andAggregateBy(
        builderOrFacet: ((facetBuilder: IFacetBuilder<T>) => void) | FacetBase): IAggregationDocumentQuery<T> {
        if (typeof builderOrFacet === "function") {
            const f = new FacetBuilder<T>();
            builderOrFacet(f);
            return this.andAggregateBy(f.getFacet());
        }

        this._source._aggregateBy(builderOrFacet as FacetBase);
        return this;
    }

    protected _getIndexQuery(): IndexQuery {
        return this._source.getIndexQuery();
    }

    public emit(eventName: "afterQueryExecuted", queryResult: QueryResult) {
        if (eventName === "afterQueryExecuted") {
            this._source.emit(eventName, queryResult);
        }
    }
}
