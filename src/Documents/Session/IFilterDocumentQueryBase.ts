import { IDocumentQueryBase } from "./IDocumentQueryBase";
import { IQueryBase } from "./IQueryBase";
import { SearchOperator } from "../Queries/SearchOperator";
import { MethodCall } from "./MethodCall";
import { WhereParams } from "./WhereParams";
import { SpatialUnits, SpatialRelation } from "../Indexes/Spatial";
import { SpatialCriteria } from "../Queries/Spatial/SpatialCriteria";
import { SpatialCriteriaFactory } from "../Queries/Spatial/SpatialCriteriaFactory";
import { IDocumentQuery } from "./IDocumentQuery";
import { DynamicSpatialField } from "../Queries/Spatial/DynamicSpatialField";
import {MoreLikeThisBase} from "../Queries/MoreLikeThis/MoreLikeThisBase";

export interface IFilterDocumentQueryBase<T extends object, TSelf extends IDocumentQueryBase<T, TSelf>> 
    extends IQueryBase<T, TSelf> {

    /**
     * Negate the next operation
     * @return Query instance
     */
    not(): TSelf;

    /**
     *  Add an AND to the query
     *  @return Query instance
     */
    andAlso(): TSelf;

    /**
     * Simplified method for closing a clause within the query
     * @return Query instance
     */
    closeSubclause(): TSelf;

    /**
     * Performs a query matching ALL of the provided values against the given field (AND)
     * @param fieldName Field name
     * @param values values to match
     * @return Query instance
     */
    containsAll(fieldName: string, values: any[]): TSelf;

    //TBD TSelf ContainsAll<TValue>(Expression<Func<T, TValue>> propertySelector, IEnumerable<TValue> values);

    /**
     * Performs a query matching ANY of the provided values against the given field (OR)
     * @param fieldName Field name
     * @param values values to match
     * @return Query instance
     */
    containsAny(fieldName: string, values: any[]): TSelf;

    //TBD TSelf ContainsAny<TValue>(Expression<Func<T, TValue>> propertySelector, IEnumerable<TValue> values);

    /**
     * Negate the next operation
     */
    negateNext(): void;

    /**
     *  Simplified method for opening a new clause within the query
     *  @return Query instance
     */
    openSubclause(): TSelf;

    /**
     * Add an OR to the query
     * @return Query instance
     */
    orElse(): TSelf;

    /**
     * Perform a search for documents which fields that match the searchTerms.
     * If there is more than a single term, each of them will be checked independently.
     *
     * Space separated terms e.g. 'John Adam' means that we will look in selected field for 'John'
     * or 'Adam'.
     * @param fieldName Field name
     * @param searchTerms Search terms
     * @return Query instance
     */
    search(fieldName: string, searchTerms: string): TSelf;

    /**
     * Perform a search for documents which fields that match the searchTerms.
     * If there is more than a single term, each of them will be checked independently.
     *
     * Space separated terms e.g. 'John Adam' means that we will look in selected field for 'John'
     * or 'Adam'.
     * @param fieldName Field name
     * @param searchTerms Search terms
     * @param operator Search operator
     * @return Query instance
     */
    search(fieldName: string, searchTerms: string, operator: SearchOperator): TSelf;

    //TBD TSelf Search<TValue>(Expression<Func<T, TValue>> propertySelector, string searchTerms, SearchOperator @operator = SearchOperator.Or);

    /**
     * Filter the results from the index using the specified where clause.
     * @param fieldName Field name
     * @param whereClause Where clause
     * @return Query instance
     */
    whereLucene(fieldName: string, whereClause: string): TSelf;

    /**
     * Filter the results from the index using the specified where clause.
     * @param fieldName Field name
     * @param whereClause Where clause
     * @param exact Use exact matcher
     * @return Query instance
     */
    whereLucene(fieldName: string, whereClause: string, exact: boolean): TSelf;

    /**
     * Matches fields where the value is between the specified start and end, exclusive
     * @param fieldName Field name
     * @param start Range start
     * @param end Range end
     * @return Query instance
     */
    whereBetween(fieldName: string, start: any, end: any): TSelf;

    /**
     * Matches fields where the value is between the specified start and end, exclusive
     * @param fieldName Field name
     * @param start Range start
     * @param end Range end
     * @param exact Use exact matcher
     * @return Query instance
     */
    whereBetween(fieldName: string, start: any, end: any, exact: boolean): TSelf;

    //TBD TSelf WhereBetween<TValue>(Expression<Func<T, TValue>> propertySelector, TValue start, TValue end, bool exact = false);

    /**
     * Matches fields which ends with the specified value.
     * @param fieldName Field name
     * @param value Value to use
     * @return Query instance
     */
    whereEndsWith(fieldName: string, value: any): TSelf;

    //TBD TSelf WhereEndsWith<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value);

    /**
     * Matches value
     * @param fieldName Field name
     * @param value Value to use
     * @return Query instance
     */
    whereEquals(fieldName: string, value: any): TSelf;

    /**
     * Matches value
     * @param fieldName Field name
     * @param value Value to use
     * @param exact Use exact matcher
     * @return Query instance
     */
    whereEquals(fieldName: string, value: any, exact: boolean): TSelf;

    /**
     * Matches value
     * @param fieldName Field name
     * @param method Method call
     * @return Query instance
     */
    whereEquals(fieldName: string, method: MethodCall): TSelf;

    /**
     * Matches value
     * @param fieldName Field name
     * @param method Method call
     * @param exact Use exact matcher
     * @return Query instance
     */
    whereEquals(fieldName: string, method: MethodCall, exact: boolean): TSelf;

    //TBD TSelf WhereEquals<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false);
    //TBD TSelf WhereEquals<TValue>(Expression<Func<T, TValue>> propertySelector, MethodCall value, bool exact = false);

    /**
     * Matches value
     * @param whereParams Where params
     * @return Query instance
     */
    whereEquals(whereParams: WhereParams): TSelf;

    /**
     * Not matches value
     * @param fieldName Field name
     * @param value Value to use
     * @return Query instance
     */
    whereNotEquals(fieldName: string, value: any): TSelf;

    /**
     * Not matches value
     * @param fieldName Field name
     * @param value Value to use
     * @param exact Use exact matcher
     * @return Query instance
     */
    whereNotEquals(fieldName: string, value: any, exact: boolean): TSelf;

    /**
     * Not matches value
     * @param fieldName Field name
     * @param method Method call
     * @return Query instance
     */
    whereNotEquals(fieldName: string, method: MethodCall): TSelf;

    /**
     * Not matches value
     * @param fieldName Field name
     * @param method Method call
     * @param exact Use exact matcher
     * @return Query instance
     */
    whereNotEquals(fieldName: string, method: MethodCall, exact: boolean): TSelf;

    // TBD TSelf WhereNotEquals<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false);
    // TBD TSelf WhereNotEquals<TValue>(Expression<Func<T, TValue>> propertySelector, MethodCall value, bool exact = false);

    /**
     * Not matches value
     * @param whereParams Where params
     * @return Query instance
     */
    whereNotEquals(whereParams: WhereParams): TSelf;

    /**
     * Matches fields where the value is greater than the specified value
     * @param fieldName Field name
     * @param value Value to use
     * @return Query instance
     */
    whereGreaterThan(fieldName: string, value: any): TSelf;

    /**
     * Matches fields where the value is greater than the specified value
     * @param fieldName Field name
     * @param value Value to use
     * @param exact Use exact matcher
     * @return Query instance
     */
    whereGreaterThan(fieldName: string, value: any, exact: boolean): TSelf;

    //TBD  TSelf WhereGreaterThan<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false);

    /**
     * Matches fields where the value is greater than or equal to the specified value
     * @param fieldName Field name
     * @param value Value to use
     * @return Query instance
     */
    whereGreaterThanOrEqual(fieldName: string, value: any): TSelf;

    /**
     * Matches fields where the value is greater than or equal to the specified value
     * @param fieldName Field name
     * @param value Value to use
     * @param exact Use exact matcher
     * @return Query instance
     */
    whereGreaterThanOrEqual(fieldName: string, value: any, exact: boolean): TSelf;

    //TBD TSelf WhereGreaterThanOrEqual<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false);

    /**
     * Check that the field has one of the specified values
     * @param fieldName Field name
     * @param values Values to use
     * @return Query instance
     */
    whereIn(fieldName: string, values: any[]): TSelf;

    /**
     * Check that the field has one of the specified values
     * @param fieldName Field name
     * @param values Values to use
     * @param exact Use exact matcher
     * @return Query instance
     */
    whereIn(fieldName: string, values: any[], exact: boolean): TSelf;

    //TBD TSelf WhereIn<TValue>(Expression<Func<T, TValue>> propertySelector, IEnumerable<TValue> values, bool exact = false);

    /**
     * Matches fields where the value is less than the specified value
     * @param fieldName Field name
     * @param value Value to use
     * @return Query instance
     */
    whereLessThan(fieldName: string, value: any): TSelf;

    /**
     * Matches fields where the value is less than the specified value
     * @param fieldName Field name
     * @param value Value to use
     * @param exact Use exact matcher
     * @return Query instance
     */
    whereLessThan(fieldName: string, value: any, exact: boolean): TSelf;

    //TBD TSelf WhereLessThan<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false);

    /**
     *  Matches fields where the value is less than or equal to the specified value
     *  @param fieldName Field name
     *  @param value Value to use
     *  @return Query instance
     */
    whereLessThanOrEqual(fieldName: string, value: any): TSelf;

    /**
     *  Matches fields where the value is less than or equal to the specified value
     *  @param fieldName Field name
     *  @param value Value to use
     *  @param exact Use exact matcher
     *  @return Query instance
     */
    whereLessThanOrEqual(fieldName: string, value: any, exact: boolean): TSelf;

    //TBD TSelf WhereLessThanOrEqual<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false);

    /**
     * Matches fields which starts with the specified value.
     * @param fieldName Name of the field.
     * @param value The value.
     * @return Query instance
     */
    whereStartsWith(fieldName: string, value: any): TSelf;

    //TBD TSelf WhereStartsWith<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value);

    //TBD TSelf WhereExists<TValue>(Expression<Func<T, TValue>> propertySelector);

    /**
     * Check if the given field exists
     * @param fieldName Field name
     * @return Query instance
     */
    whereExists(fieldName: string): TSelf;

    //TBD TSelf WhereRegex<TValue>(Expression<Func<T, TValue>> propertySelector, string pattern);

    /**
     * Checks value of a given field against supplied regular expression pattern
     * @param fieldName Field name
     * @param pattern Regexp pattern
     * @return Query instance
     */
    whereRegex(fieldName: string, pattern: string): TSelf;

    //TBD TSelf WithinRadiusOf<TValue>(Expression<Func<T, TValue>> propertySelector, double radius, double latitude, double longitude, SpatialUnits? radiusUnits = null, double distanceErrorPct = Constants.Documents.Indexing.Spatial.DefaultDistanceErrorPct);

    /**
     * Filter matches to be inside the specified radius
     * @param fieldName Spatial field name.
     * @param radius Radius (measured in units passed to radiusUnits parameter) in which matches should be found.
     * @param latitude Latitude pointing to a circle center.
     * @param longitude Longitude pointing to a circle center.
     * @return Query instance
     */
    withinRadiusOf(fieldName: string, radius: number, latitude: number, longitude: number): TSelf;

    /**
     * Filter matches to be inside the specified radius
     * @param fieldName Spatial field name.
     * @param radius Radius (measured in units passed to radiusUnits parameter) in which matches should be found.
     * @param latitude Latitude pointing to a circle center.
     * @param longitude Longitude pointing to a circle center.
     * @param radiusUnits Units that will be used to measure distances (Kilometers, Miles).
     * @return Query instance
     */
    withinRadiusOf(
        fieldName: string, radius: number, latitude: number, longitude: number, radiusUnits: SpatialUnits): TSelf;

    /**
     * Filter matches to be inside the specified radius
     * @param fieldName Spatial field name.
     * @param radius Radius (measured in units passed to radiusUnits parameter) in which matches should be found.
     * @param latitude Latitude pointing to a circle center.
     * @param longitude Longitude pointing to a circle center.
     * @param radiusUnits Units that will be used to measure distances (Kilometers, Miles).
     * @param distanceErrorPct Distance error percent
     * @return Query instance
     */
    withinRadiusOf(
        fieldName: string, 
        radius: number, 
        latitude: number, 
        longitude: number, 
        radiusUnits: SpatialUnits, 
        distanceErrorPct: number): TSelf;

    // tslint:disable-next-line:max-line-length
    // TBD TSelf RelatesToShape<TValue>(Expression<Func<T, TValue>> propertySelector, string shapeWkt, SpatialRelation relation, double distanceErrorPct = Constants.Documents.Indexing.Spatial.DefaultDistanceErrorPct);

    /**
     * Filter matches based on a given shape - only documents with the shape defined in fieldName that
     * have a relation rel with the given shapeWkt will be returned
     * @param fieldName Spatial field name.
     * @param shapeWkt WKT formatted shape
     * @param relation Spatial relation to check (Within, Contains, Disjoint, Intersects, Nearby)
     * @return Query instance
     */
    relatesToShape(fieldName: string, shapeWkt: string, relation: SpatialRelation): TSelf;

    /**
     * Filter matches based on a given shape - only documents with the shape defined in fieldName that
     * have a relation rel with the given shapeWkt will be returned
     * @param fieldName Spatial field name.
     * @param shapeWkt WKT formatted shape
     * @param relation Spatial relation to check (Within, Contains, Disjoint, Intersects, Nearby)
     * @param distanceErrorPct The allowed error percentage. By default: 0.025
     * @return Query instance
     */
    relatesToShape(fieldName: string, shapeWkt: string, relation: SpatialRelation, distanceErrorPct: number): TSelf;

    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> Spatial(Expression<Func<T, object>> path, Func<SpatialCriteriaFactory, SpatialCriteria> clause);

    /**
     * Ability to use one factory to determine spatial shape that will be used in query.
     * @param fieldName Field name
     * @param clause Spatial criteria factory
     * @return Query instance
     */
    spatial(
        fieldName: string, 
        clause: (spatialCriteriaFactory: SpatialCriteriaFactory) => SpatialCriteria): IDocumentQuery<T>;

    spatial(
        field: DynamicSpatialField, 
        clause: (spatialCriteriaFactory: SpatialCriteriaFactory) => SpatialCriteria): IDocumentQuery<T>;

    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> spatial(Function<SpatialDynamicFieldFactory<T>, DynamicSpatialField> field, Function<SpatialCriteriaFactory, SpatialCriteria> clause);

    moreLikeThis(moreLikeThis: MoreLikeThisBase): IDocumentQuery<T>;
}
