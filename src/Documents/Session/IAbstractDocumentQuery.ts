import {SearchOperator} from "../Queries/SearchOperator";
import {OrderingType} from "./OrderingType";
import { DocumentConventions } from "../..";
import { MethodCall } from "./MethodCall";
import { WhereParams } from "./WhereParams";
import { DynamicSpatialField } from "../Queries/Spatial/DynamicSpatialField";
import { SpatialCriteria } from "../Queries/Spatial/SpatialCriteria";
import { GroupBy } from "../Queries/GroupBy";
import {DocumentType} from "../DocumentAbstractions";
import {MoreLikeThisScope} from "../Queries/MoreLikeThis/MoreLikeThisScope";

export interface IAbstractDocumentQuery<T> {

    indexName: string;

    collectionName: string;

    /**
     * Gets the document convention from the query session
     * @return document conventions
     */
    conventions: DocumentConventions;

    /**
     * Determines if it is a dynamic map-reduce query
     * @return true if it is dynamic query
     */
    isDynamicMapReduce(): boolean;

    /**
     * Instruct the query to wait for non stale result for the specified wait timeout.
     * @param waitTimeout Wait timeout
     */
    _waitForNonStaleResults(waitTimeout: number): void;

    /**
     * Gets the fields for projection
     * @return list of projection fields
     */
    getProjectionFields(): string[];

    /**
     * Order the search results randomly
     */
    _randomOrdering(): void;

    /**
     * Order the search results randomly using the specified seed
     * this is useful if you want to have repeatable random queries
     * @param seed Seed to use
     */
    _randomOrdering(seed: string): void;

    //TBD 4.1 void _customSortUsing(String typeName);

    //TBD 4.1 void _customSortUsing(String typeName, boolean descending);

    /**
     * Includes the specified path in the query, loading the document specified in that path
     * @param path include path
     */
    _include(path: string): void;

    // TBD expr linq void Include(Expression<Func<T, object>> path);

    /**
     * Takes the specified count.
     * @param count Items to take
     */
    _take(count: number): void;

    /**
     * Skips the specified count.
     * @param count Items to skip
     */
    _skip(count: number): void;

    /**
     * Matches value
     * @param fieldName Field name
     * @param value Value to match
     */
    _whereEquals(fieldName: string, value: any): void;

    /**
     * Matches value
     * @param fieldName Field name
     * @param value Value to match
     * @param exact Use exact matcher
     */
    _whereEquals(fieldName: string, value: any, exact: boolean): void;

    /**
     * Matches value
     * @param fieldName Field name
     * @param method Method call to use
     */
    _whereEquals(fieldName: string, method: MethodCall): void;

    /**
     * Matches value
     * @param fieldName Field name
     * @param method Method call to use
     * @param exact Use exact matcher
     */
    _whereEquals(fieldName: string, method: MethodCall, exact: boolean): void;

    /**
     * Matches value
     * @param whereParams Where parameters
     */
    _whereEquals(whereParams: WhereParams): void;

    /**
     * Not matches value
     * @param fieldName Field name
     * @param value Value to match
     */
    _whereNotEquals(fieldName: string, value: any): void;

    /**
     * Not matches value
     * @param fieldName Field name
     * @param value Value to match
     * @param exact Use exact matcher
     */
    _whereNotEquals(fieldName: string, value: any, exact: boolean): void;

    /**
     * Not matches value
     * @param fieldName Field name
     * @param method Method call to use
     */
    _whereNotEquals(fieldName: string, method: MethodCall): void;

    /**
     * Not matches value
     * @param fieldName Field name
     * @param method Method call to use
     * @param exact Use exact matcher
     */
    _whereNotEquals(fieldName: string, method: MethodCall, exact: boolean): void;

    /**
     * Not matches value
     * @param whereParams Where parameters
     */
    _whereNotEquals(whereParams: WhereParams): void;

    /**
     * Simplified method for opening a new clause within the query
     */
    _openSubclause(): void;

    /**
     * Simplified method for closing a clause within the query
     */
    _closeSubclause(): void;

    /**
     * Negate the next operation
     */
    negateNext(): void;

    /**
     * Check that the field has one of the specified value
     * @param fieldName Field name
     * @param values Values to match
     */
    _whereIn(fieldName: string, values: any[]): void;

    /**
     * Check that the field has one of the specified value
     * @param fieldName Field name
     * @param values Values to match
     * @param exact Use exact matcher
     */
    _whereIn(fieldName: string, values: any[], exact: boolean): void;

    /**
     * Matches fields which starts with the specified value.
     * @param fieldName Field name
     * @param value to match
     */
    _whereStartsWith(fieldName: string, value: any): void;

    /**
     * Matches fields which ends with the specified value.
     * @param fieldName Field name
     * @param value Value to match
     */
    _whereEndsWith(fieldName: string, value: any): void;

    /**
     * Matches fields where the value is between the specified start and end, exclusive
     * @param fieldName Field name
     * @param start Range start
     * @param end Range end
     */
    _whereBetween(fieldName: string, start: any, end: any): void;

    /**
     * Matches fields where the value is between the specified start and end, exclusive
     * @param fieldName Field name
     * @param start Range start
     * @param end Range end
     * @param exact Use exact matcher
     */
    _whereBetween(fieldName: string, start: any, end: any, exact: boolean): void;

    /**
     * Matches fields where the value is greater than the specified value
     * @param fieldName Field name
     * @param value Value to match
     */
    _whereGreaterThan(fieldName: string, value: any): void;

    /**
     * Matches fields where the value is greater than the specified value
     * @param fieldName Field name
     * @param value Value to match
     * @param exact Use exact matcher
     */
    _whereGreaterThan(fieldName: string, value: any, exact: boolean): void;

    /**
     * Matches fields where the value is greater than or equal to the specified value
     * @param fieldName Field name
     * @param value Value to match
     */
    _whereGreaterThanOrEqual(fieldName: string, value: any): void;

    /**
     * Matches fields where the value is greater than or equal to the specified value
     * @param fieldName Field name
     * @param value Value to match
     * @param exact Use exact matcher
     */
    _whereGreaterThanOrEqual(fieldName: string, value: any, exact: boolean): void;

    /**
     * Matches fields where the value is less than the specified value
     * @param fieldName Field name
     * @param value Value to match
     */
    _whereLessThan(fieldName: string, value: any): void;

    /**
     * Matches fields where the value is less than the specified value
     * @param fieldName Field name
     * @param value Value to match
     * @param exact Use exact matcher
     */
    _whereLessThan(fieldName: string, value: any, exact: boolean): void;

    /**
     * Matches fields where the value is less than or equal to the specified value
     * @param fieldName Field name
     * @param value Value to match
     */
    _whereLessThanOrEqual(fieldName: string, value: any): void;

    /**
     * Matches fields where the value is less than or equal to the specified value
     * @param fieldName Field name
     * @param value Value to match
     * @param exact Use exact matcher
     */
    _whereLessThanOrEqual(fieldName: string, value: any, exact: boolean): void;

    _whereExists(fieldName: string): void;

    _whereRegex(fieldName: string, pattern: string): void;

    /**
     * Add an AND to the query
     */
    _andAlso(): void;

    /**
     * Add an OR to the query
     */
    _orElse(): void;

    /**
     * Specifies a boost weight to the last where clause.
     * The higher the boost factor, the more relevant the term will be.
     *
     * boosting factor where 1.0 is default, less than 1.0 is lower weight, greater than 1.0 is higher weight
     *
     * http://lucene.apache.org/java/2_4_0/queryparsersyntax.html#Boosting%20a%20Term
     * @param boost Boost value
     */
    _boost(boost: number): void;

    /**
     * Specifies a fuzziness factor to the single word term in the last where clause
     *
     * 0.0 to 1.0 where 1.0 means closer match
     *
     * http://lucene.apache.org/java/2_4_0/queryparsersyntax.html#Fuzzy%20Searches
     *
     * @param fuzzy Fuzzy value
     */
    _fuzzy(fuzzy: number): void;

    /**
     * Specifies a proximity distance for the phrase in the last where clause
     *
     * http://lucene.apache.org/java/2_4_0/queryparsersyntax.html#Proximity%20Searches
     * @param proximity Proximity value
     */
    _proximity(proximity: number): void;

    /**
     * Order the results by the specified fields
     * The field is the name of the field to sort, defaulting to sorting by ascending.
     * @param field Field to use
     */
    _orderBy(field: string): void;

    /**
     * Order the results by the specified fields
     * The field is the name of the field to sort, defaulting to sorting by ascending.
     * @param field Field to use
     * @param ordering Ordering type
     */
    _orderBy(field: string, ordering: OrderingType): void;

    _orderByDescending(field: string): void;

    _orderByDescending(field: string, ordering: OrderingType): void;

    _orderByScore(): void;

    _orderByScoreDescending(): void;

    // TBD void Highlight(string fieldName, int fragmentLength, int fragmentCount, string fragmentsField);
    // tslint:disable-next-line:max-line-length
    // TBD void Highlight(string fieldName, int fragmentLength, int fragmentCount, out FieldHighlightings highlightings);
    // tslint:disable-next-line:max-line-length
    // TBD void Highlight(string fieldName, string fieldKeyName, int fragmentLength, int fragmentCount, out FieldHighlightings highlightings);
    // TBD void SetHighlighterTags(string preTag, string postTag);
    // TBD void SetHighlighterTags(string[] preTags, string[] postTags);

    /**
     * Perform a search for documents which fields that match the searchTerms.
     * If there is more than a single term, each of them will be checked independently.
     * @param fieldName Field name
     * @param searchTerms Search terms
     */
    _search(fieldName: string, searchTerms: string): void;

    /**
     * Perform a search for documents which fields that match the searchTerms.
     * If there is more than a single term, each of them will be checked independently.
     * @param fieldName Field name
     * @param searchTerms Search terms
     * @param operator Operator
     */
    _search(fieldName: string, searchTerms: string, operator: SearchOperator): void;

    toString(): string;

    _intersect(): void;

    addRootType(clazz: DocumentType): void;

    _distinct(): void;

    /**
     * Performs a query matching ANY of the provided values against the given field (OR)
     * @param fieldName Field name
     * @param values Values to match
     */
    _containsAny(fieldName: string, values: any[]): void;

    /**
     * Performs a query matching ALL of the provided values against the given field (AND)
     * @param fieldName Field name
     * @param values Values to match
     */
    _containsAll(fieldName: string, values: any[]): void;

    _groupBy(fieldName: string, ...fieldNames: string[]): void;

    _groupBy(field: GroupBy, ...fields: GroupBy[]): void;

    _groupByKey(fieldName: string): void;

    _groupByKey(fieldName: string, projectedName: string): void;

    _groupBySum(fieldName: string): void;

    _groupBySum(fieldName: string, projectedName: string): void;

    _groupByCount(): void;

    _groupByCount(projectedName: string): void;

    _whereTrue(): void;

    _spatial(field: DynamicSpatialField, criteria: SpatialCriteria): void;

    _spatial(fieldName: string, criteria: SpatialCriteria): void;

    _orderByDistance(field: DynamicSpatialField, latitude: number, longitude: number): void;

    _orderByDistance(fieldName: string, latitude: number, longitude: number): void;

    _orderByDistance(field: DynamicSpatialField, shapeWkt: string): void;

    _orderByDistance(fieldName: string, shapeWkt: string): void;

    _orderByDistanceDescending(field: DynamicSpatialField, latitude: number, longitude: number): void;

    _orderByDistanceDescending(fieldName: string, latitude: number, longitude: number): void;

    _orderByDistanceDescending(field: DynamicSpatialField, shapeWkt: string): void;

    _orderByDistanceDescending(fieldName: string, shapeWkt: string): void;

    _moreLikeThis(): MoreLikeThisScope;

    // TBD void AggregateBy(FacetBase facet);
    // TBD IAggregationDocumentQuery<T> AggregateBy(Action<IFacetBuilder<T>> builder);
    // TBD void AggregateUsing(string facetSetupDocumentId);
    // TBD void SuggestUsing(SuggestionBase suggestion);

    iterator(): Promise<IterableIterator<T>>;
}