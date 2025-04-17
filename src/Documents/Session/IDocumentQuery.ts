import { IDocumentQueryBaseSingle } from "./IDocumentQueryBaseSingle.js";
import { IAggregationDocumentQuery } from "../Queries/Facets/IAggregationDocumentQuery.js";
import { IEnumerableQuery } from "./IEnumerableQuery.js";
import { QueryResult } from "../Queries/QueryResult.js";
import { DocumentType } from "../DocumentAbstractions.js";
import { QueryData } from "../Queries/QueryData.js";
import { GroupBy } from "../Queries/GroupBy.js";
import { IDocumentQueryBase } from "./IDocumentQueryBase.js";
import { IGroupByDocumentQuery } from "./IGroupByDocumentQuery.js";
import { IFacetBuilder } from "../Queries/Facets/IFacetBuilder.js";
import { FacetBase } from "../Queries/Facets/FacetBase.js";
import { IMoreLikeThisBuilderForDocumentQuery } from "../Queries/MoreLikeThis/IMoreLikeThisBuilderForDocumentQuery.js";
import { MoreLikeThisBase } from "../Queries/MoreLikeThis/MoreLikeThisBase.js";
import { ISuggestionBuilder } from "../Queries/Suggestions/ISuggestionBuilder.js";
import { ISuggestionDocumentQuery } from "../Queries/Suggestions/ISuggestionDocumentQuery.js";
import { SuggestionBase } from "../Queries/Suggestions/SuggestionBase.js";
import { ITimeSeriesQueryBuilder } from "../Queries/TimeSeries/ITimeSeriesQueryBuilder.js";
import { TimeSeriesAggregationResult } from "../Queries/TimeSeries/TimeSeriesAggregationResult.js";
import { TimeSeriesRawResult } from "../Queries/TimeSeries/TimeSeriesRawResult.js";
import { Field } from "../../Types/index.js";
import { ProjectionBehavior } from "../Queries/ProjectionBehavior.js";
import { IFilterFactory } from "../Queries/IFilterFactory.js";
import { IQueryShardedContextBuilder } from "./Querying/Sharding/IQueryShardedContextBuilder.js";
import { IVectorOptions, VectorOptions } from "../Queries/VectorSearch/VectorSearchOptions.js";
import {
    IVectorEmbeddingField,
    IVectorEmbeddingTextField,
    IVectorField,
    IVectorFieldFactory, IVectorFieldValueFactory
} from "./IVectorFieldFactory.js";

/**
 * A query against a Raven index
 */
export interface IDocumentQuery<T extends object>
    extends IDocumentQueryBase<T, IDocumentQuery<T>>,
        IDocumentQueryBaseSingle<T>,
        IEnumerableQuery<T> {

    indexName: string;

    /**
     * Whether we should apply distinct operation to the query on the server side
     */
    isDistinct: boolean;

    /**
     * Returns the query result. Accessing this property for the first time will execute the query.
     */
    getQueryResult(): Promise<QueryResult>;

    //TODO: support for js projections?

    /**
     * Selects the specified fields directly from the index if the are stored.
     * If the field is not stored in index, value
     * will come from document directly.
     */
    selectFields<TProjection extends object>(
        property: string, projectionClass: DocumentType<TProjection>): IDocumentQuery<TProjection>;

    /**
     * Selects the specified fields directly from the index if the are stored.
     * If the field is not stored in index, value
     * will come from document directly.
     */
    selectFields<TProjection extends object>(
        properties: string[], projectionClass: DocumentType<TProjection>): IDocumentQuery<TProjection>;

    /**
     * Selects the specified fields directly from the index if the are stored.
     * If the field is not stored in index, value
     * will come from document directly.
     */
    selectFields<TProjection extends object>(
        properties: string[], projectionClass: DocumentType<TProjection>, projectionBehavior: ProjectionBehavior): IDocumentQuery<TProjection>;

    /**
     * Selects the specified fields directly from the index if the are stored.
     * If the field is not stored in index, value will come from document directly.
     */
    selectFields<TProjection extends object>(properties: string[]): IDocumentQuery<TProjection>;

    /**
     * Selects the specified fields directly from the index if the are stored.
     * If the field is not stored in index, value will come from document directly.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    selectFields<TProjection extends Object>(property: string): IDocumentQuery<TProjection>;

    /**
     * Selects the specified fields directly from the index if the are stored.
     * If the field is not stored in index, value will come from document directly.
     */
    selectFields<TProjection extends object>(
        queryData: QueryData, projectionClass: DocumentType<TProjection>): IDocumentQuery<TProjection>;

    /**
     * Selects the specified fields directly from the index if the are stored.
     * If the field is not stored in index, value will come from document directly.
     */
    selectFields<TProjection extends object>(
        queryData: QueryData, projectionClass: DocumentType<TProjection>, projectionBehavior: ProjectionBehavior): IDocumentQuery<TProjection>;

    /**
     * Selects a Time Series Aggregation based on
     * a time series query generated by an ITimeSeriesQueryBuilder.
     * @param timeSeriesQuery query provider
     * @param projectionClass result class
     */
    selectTimeSeries(
        timeSeriesQuery: (builder: ITimeSeriesQueryBuilder) => void,
        projectionClass: DocumentType<TimeSeriesAggregationResult>): IDocumentQuery<TimeSeriesAggregationResult>;

    /**
     * Selects a Time Series Aggregation based on
     * a time series query generated by an ITimeSeriesQueryBuilder.
     * @param timeSeriesQuery query provider
     * @param projectionClass result class
     */
    selectTimeSeries(
        timeSeriesQuery: (builder: ITimeSeriesQueryBuilder) => void,
        projectionClass: DocumentType<TimeSeriesRawResult>): IDocumentQuery<TimeSeriesRawResult>;

    /**
     * Changes the return type of the query
     */
    ofType<TResult extends object>(resultClass: DocumentType<TResult>): IDocumentQuery<TResult>;

    groupBy(fieldName: Field<T>, ...fieldNames: string[]): IGroupByDocumentQuery<T>;

    groupBy(field: GroupBy, ...fields: GroupBy[]): IGroupByDocumentQuery<T>;

    moreLikeThis(
        builder: (moreLikeThisBuilder: IMoreLikeThisBuilderForDocumentQuery<T>) => void): IDocumentQuery<T>;

    moreLikeThis(moreLikeThis: MoreLikeThisBase): IDocumentQuery<T>;


    /**
     * Filter allows querying on documents without the need for issuing indexes.
     * It is meant for exploratory queries or post query filtering.
     * Criteria are evaluated at query time so please use Filter wisely to avoid performance issues.
     * @param builder Builder of a Filter query
     */
    filter(builder: (factory: IFilterFactory<T>) => void): IDocumentQuery<T>;

    /**
     * Filter allows querying on documents without the need for issuing indexes.
     * It is meant for exploratory queries or post query filtering.
     * Criteria are evaluated at query time so please use Filter wisely to avoid performance issues.
     * @param builder Builder of a Filter query
     * @param limit Limits the number of documents processed by Filter.
     */
    filter(builder: (factory: IFilterFactory<T>) => void, limit: number): IDocumentQuery<T>;

    //TBD MoreLikeThis

    suggestUsing(suggestion: SuggestionBase): ISuggestionDocumentQuery<T>;

    suggestUsing(action: (builder: ISuggestionBuilder<T>) => void): ISuggestionDocumentQuery<T>;

    shardContext(action: (builder: IQueryShardedContextBuilder) => void): IDocumentQuery<T>;

    aggregateBy(action: (builder: IFacetBuilder<T>) => void): IAggregationDocumentQuery<T>;

    aggregateBy(facet: FacetBase): IAggregationDocumentQuery<T>;

    aggregateBy(...facet: FacetBase[]): IAggregationDocumentQuery<T>;

    aggregateUsing(facetSetupDocumentId: string): IAggregationDocumentQuery<T>;

    vectorSearch(
        fieldName: Field<T>,
        valueFactory: number[] | string,
        options?: IVectorOptions
    ): IDocumentQuery<T>;
    vectorSearch(
        fieldName: ((factory: IVectorFieldFactory<T>) => IVectorField | IVectorEmbeddingField | IVectorEmbeddingTextField),
        valueFactory: ((factory: IVectorFieldValueFactory) => void),
        options?: IVectorOptions
    ): IDocumentQuery<T>;
}