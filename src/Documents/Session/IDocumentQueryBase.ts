import { IQueryBase } from "./IQueryBase";
import { IFilterDocumentQueryBase } from "./IFilterDocumentQueryBase";
import { OrderingType } from "./OrderingType";
import { DynamicSpatialField } from "../Queries/Spatial/DynamicSpatialField";

export interface IDocumentQueryBase<T extends object, TSelf extends IDocumentQueryBase<T, TSelf>> 
    extends IQueryBase<T, TSelf>, IFilterDocumentQueryBase<T, TSelf> {

    /**
     * Adds an ordering for a specific field to the query
     */
    addOrder(fieldName: string, descending: boolean): TSelf;

    /**
     * Adds an ordering for a specific field to the query
     */
    addOrder(fieldName: string, descending: boolean, ordering: OrderingType): TSelf;

    //TBD TSelf AddOrder<TValue>(Expression<Func<T, TValue>> propertySelector,
    //      bool descending = false, OrderingType ordering = OrderingType.String);

    /**
     * Specifies a boost weight to the last where clause.
     * The higher the boost factor, the more relevant the term will be.
     *
     * boosting factor where 1.0 is default, less than 1.0 is lower weight, greater than 1.0 is higher weight
     *
     * http://lucene.apache.org/java/2_4_0/queryparsersyntax.html#Boosting%20a%20Term
     */
    boost(boost: number): TSelf;

    /**
     * Apply distinct operation to this query
     */
    distinct(): TSelf;

    //TBD 4.1 TSelf explainScores();

    /**
     * Specifies a fuzziness factor to the single word term in the last where clause
     * 0.0 to 1.0 where 1.0 means closer match
     *
     * http://lucene.apache.org/java/2_4_0/queryparsersyntax.html#Fuzzy%20Searches
     */
    fuzzy(fuzzy: number): TSelf;

    //TBD 4.1 TSelf Highlight(string fieldName, int fragmentLength,
    //     int fragmentCount, string fragmentsField);

    //TBD 4.1 TSelf Highlight(string fieldName, int fragmentLength,
    //     int fragmentCount, out FieldHighlightings highlightings);

    //TBD 4.1 TSelf Highlight(string fieldName, string fieldKeyName, int fragmentLength,
    //     int fragmentCount, out FieldHighlightings highlightings);

    //TBD 4.1 TSelf Highlight<TValue>(Expression<Func<T, TValue>> propertySelector,
    //     int fragmentLength, int fragmentCount, Expression<Func<T, IEnumerable>> fragmentsPropertySelector);

    //TBD 4.1 TSelf Highlight<TValue>(Expression<Func<T, TValue>> propertySelector,
    //     int fragmentLength, int fragmentCount, out FieldHighlightings highlightings);

    //TBD 4.1 TSelf Highlight<TValue>(Expression<Func<T, TValue>> propertySelector,
    //     Expression<Func<T, TValue>> keyPropertySelector, int fragmentLength, int fragmentCount,
    //     out FieldHighlightings highlightings);

    /**
     * Includes the specified path in the query, loading the document specified in that path
     */
    include(path: string): TSelf;

    //TBD TSelf Include(Expression<Func<T, object>> path);

    /**
     * Partition the query so we can intersect different parts of the query
     *  across different index entries.
     */
    intersect(): TSelf;

    /**
     * Order the results by the specified fields
     * The field is the name of the field to sort, defaulting to sorting by ascending.
     */
    orderBy(field: string): TSelf;

    /**
     * Order the results by the specified fields
     * The field is the name of the field to sort, defaulting to sorting by ascending.
     */
    orderBy(field: string, ordering: OrderingType): TSelf;

    //TBD TSelf OrderBy<TValue>(params Expression<Func<T, TValue>>[] propertySelectors);

    /**
     * Order the results by the specified fields
     * The field is the name of the field to sort, defaulting to sorting by descending.
     */
    orderByDescending(field: string): TSelf;

    /**
     * Order the results by the specified fields
     * The field is the name of the field to sort, defaulting to sorting by descending.
     */
    orderByDescending(field: string, ordering: OrderingType): TSelf;

    //TBD TSelf OrderByDescending<TValue>(params Expression<Func<T, TValue>>[] propertySelectors);

    /**
     * Adds an ordering by score for a specific field to the query
     */
    orderByScore(): TSelf;

    /**
     * Adds an ordering by score for a specific field to the query
     */
    orderByScoreDescending(): TSelf;

    /**
     * Specifies a proximity distance for the phrase in the last where clause
     * http://lucene.apache.org/java/2_4_0/queryparsersyntax.html#Proximity%20Searches
     */
    proximity(proximity: number): TSelf;

    /**
     * Order the search results randomly
     */
    randomOrdering(): TSelf;

    /**
     * Order the search results randomly using the specified seed
     * this is useful if you want to have repeatable random queries
     */
    randomOrdering(seed: string): TSelf;

    //TBD 4.1 TSelf customSortUsing(String typeName, boolean descending);

    //TBD 4.1 TSelf SetHighlighterTags(string preTag, string postTag);
    //TBD 4.1 TSelf SetHighlighterTags(string[] preTags, string[] postTags);

    /**
     * Sorts the query results by distance.
     */
    orderByDistance(field: DynamicSpatialField, latitude: number, longitude: number): TSelf;

    //TBD TSelf OrderByDistance(Func<DynamicSpatialFieldFactory<T>, DynamicSpatialField> field,
    //     double latitude, double longitude);

    orderByDistance(field: DynamicSpatialField, shapeWkt: string): TSelf;

    //TBD TSelf OrderByDistance(Func<DynamicSpatialFieldFactory<T>, DynamicSpatialField> field, string shapeWkt);

    //TBD TSelf OrderByDistance<TValue>(Expression<Func<T, TValue>> propertySelector,
    //     double latitude, double longitude);

    /**
     * Sorts the query results by distance.
     */
    orderByDistance(fieldName: string, latitude: number, longitude: number): TSelf;

    //TBD TSelf OrderByDistance<TValue>(Expression<Func<T, TValue>> propertySelector, string shapeWkt);

    /**
     * Sorts the query results by distance.
     */
    orderByDistance(fieldName: string, shapeWkt: string): TSelf;

    /**
     * Sorts the query results by distance.
     */
    orderByDistanceDescending(field: DynamicSpatialField, latitude: number, longitude: number): TSelf;

    //TBD TSelf OrderByDistanceDescending(Func<DynamicSpatialFieldFactory<T>,
    //     DynamicSpatialField> field, double latitude, double longitude);

    orderByDistanceDescending(field: DynamicSpatialField, shapeWkt: string): TSelf;

    //TBD TSelf OrderByDistanceDescending(Func<DynamicSpatialFieldFactory<T>,
    //     DynamicSpatialField> field, string shapeWkt);

    //TBD TSelf OrderByDistanceDescending<TValue>(Expression<Func<T, TValue>> propertySelector,
    //     double latitude, double longitude);

    /**
     * Sorts the query results by distance.
     */
    orderByDistanceDescending(fieldName: string, latitude: number, longitude: number): TSelf;

    //TBD TSelf OrderByDistanceDescending<TValue>(Expression<Func<T, TValue>> propertySelector, string shapeWkt);

    /**
     * Sorts the query results by distance.
     */
    orderByDistanceDescending(fieldName: string, shapeWkt: string): TSelf;
}
