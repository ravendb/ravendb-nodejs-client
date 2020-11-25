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
import { MoreLikeThisBase } from "../Queries/MoreLikeThis/MoreLikeThisBase";
import { Field } from "../../Types";

export interface IFilterDocumentQueryBase<T extends object, TSelf extends IDocumentQueryBase<T, TSelf>>
    extends IQueryBase<T, TSelf> {

    /**
     * Negate the next operation
     */
    not(): TSelf;

    /**
     *  Add an AND to the query
     */
    andAlso(): TSelf;

    /**
     * Simplified method for closing a clause within the query
     */
    closeSubclause(): TSelf;

    /**
     * Performs a query matching ALL of the provided values against the given field (AND)
     */
    containsAll(fieldName: Field<T>, values: any[]): TSelf;

    //TBD TSelf ContainsAll<TValue>(Expression<Func<T, TValue>> propertySelector, IEnumerable<TValue> values);

    /**
     * Performs a query matching ANY of the provided values against the given field (OR)
     */
    containsAny(fieldName: Field<T>, values: any[]): TSelf;

    //TBD TSelf ContainsAny<TValue>(Expression<Func<T, TValue>> propertySelector, IEnumerable<TValue> values);

    /**
     * Negate the next operation
     */
    negateNext(): TSelf;

    /**
     *  Simplified method for opening a new clause within the query
     */
    openSubclause(): TSelf;

    /**
     * Add an OR to the query
     */
    orElse(): TSelf;

    /**
     * Perform a search for documents which fields that match the searchTerms.
     * If there is more than a single term, each of them will be checked independently.
     *
     * Space separated terms e.g. 'John Adam' means that we will look in selected field for 'John'
     * or 'Adam'.
     */
    search(fieldName: Field<T>, searchTerms: string): TSelf;

    /**
     * Perform a search for documents which fields that match the searchTerms.
     * If there is more than a single term, each of them will be checked independently.
     *
     * Space separated terms e.g. 'John Adam' means that we will look in selected field for 'John'
     * or 'Adam'.
     */
    search(fieldName: Field<T>, searchTerms: string, operator: SearchOperator): TSelf;

    //TBD TSelf Search<TValue>(Expression<Func<T, TValue>> propertySelector, string searchTerms,
    //     SearchOperator @operator = SearchOperator.Or);

    /**
     * Filter the results from the index using the specified where clause.
     */
    whereLucene(fieldName: Field<T>, whereClause: string): TSelf;

    /**
     * Filter the results from the index using the specified where clause.
     */
    whereLucene(fieldName: Field<T>, whereClause: string, exact: boolean): TSelf;

    /**
     * Matches fields where the value is between the specified start and end, inclusive
     */
    whereBetween(fieldName: Field<T>, start: any, end: any): TSelf;

    /**
     * Matches fields where the value is between the specified start and end, inclusive
     */
    whereBetween(fieldName: Field<T>, start: any, end: any, exact: boolean): TSelf;

    //TBD TSelf WhereBetween<TValue>(Expression<Func<T, TValue>> propertySelector,
    //     TValue start, TValue end, bool exact = false);

    /**
     * Matches fields which ends with the specified value.
     */
    whereEndsWith(fieldName: Field<T>, value: any): TSelf;

    /**
     * Matches fields which ends with the specified value.
     */
    whereEndsWith(fieldName: Field<T>, value: any, exact: boolean): TSelf;

    //TBD TSelf WhereEndsWith<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value);

    /**
     * Matches value
     */
    whereEquals(fieldName: Field<T>, value: any): TSelf;

    /**
     * Matches value
     */
    whereEquals(fieldName: Field<T>, value: any, exact: boolean): TSelf;

    /**
     * Matches value
     */
    whereEquals(fieldName: Field<T>, method: MethodCall): TSelf;

    /**
     * Matches value
     */
    whereEquals(fieldName: Field<T>, method: MethodCall, exact: boolean): TSelf;

    //TBD TSelf WhereEquals<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false);
    //TBD TSelf WhereEquals<TValue>(Expression<Func<T, TValue>> propertySelector, MethodCall value, bool exact = false);

    /**
     * Matches value
     */
    whereEquals(whereParams: WhereParams): TSelf;

    /**
     * Not matches value
     */
    whereNotEquals(fieldName: Field<T>, value: any): TSelf;

    /**
     * Not matches value
     */
    whereNotEquals(fieldName: Field<T>, value: any, exact: boolean): TSelf;

    /**
     * Not matches value
     */
    whereNotEquals(fieldName: Field<T>, method: MethodCall): TSelf;

    /**
     * Not matches value
     */
    whereNotEquals(fieldName: Field<T>, method: MethodCall, exact: boolean): TSelf;

    // TBD TSelf WhereNotEquals<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false);
    // TBD TSelf WhereNotEquals<TValue>(Expression<Func<T, TValue>> propertySelector,
    //     MethodCall value, bool exact = false);

    /**
     * Not matches value
     */
    whereNotEquals(whereParams: WhereParams): TSelf;

    /**
     * Matches fields where the value is greater than the specified value
     */
    whereGreaterThan(fieldName: Field<T>, value: any): TSelf;

    /**
     * Matches fields where the value is greater than the specified value
     */
    whereGreaterThan(fieldName: Field<T>, value: any, exact: boolean): TSelf;

    //TBD  TSelf WhereGreaterThan<TValue>(Expression<Func<T, TValue>> propertySelector,
    //     TValue value, bool exact = false);

    /**
     * Matches fields where the value is greater than or equal to the specified value
     */
    whereGreaterThanOrEqual(fieldName: Field<T>, value: any): TSelf;

    /**
     * Matches fields where the value is greater than or equal to the specified value
     */
    whereGreaterThanOrEqual(fieldName: Field<T>, value: any, exact: boolean): TSelf;

    //TBD TSelf WhereGreaterThanOrEqual<TValue>(Expression<Func<T, TValue>> propertySelector,
    //     TValue value, bool exact = false);

    /**
     * Check that the field has one of the specified values
     */
    whereIn(fieldName: Field<T>, values: any[]): TSelf;

    /**
     * Check that the field has one of the specified values
     */
    whereIn(fieldName: Field<T>, values: any[], exact: boolean): TSelf;

    //TBD TSelf WhereIn<TValue>(Expression<Func<T, TValue>> propertySelector, IEnumerable<TValue> values,
    //     bool exact = false);

    /**
     * Matches fields where the value is less than the specified value
     */
    whereLessThan(fieldName: Field<T>, value: any): TSelf;

    /**
     * Matches fields where the value is less than the specified value
     */
    whereLessThan(fieldName: Field<T>, value: any, exact: boolean): TSelf;

    //TBD TSelf WhereLessThan<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value, bool exact = false);

    /**
     *  Matches fields where the value is less than or equal to the specified value
     */
    whereLessThanOrEqual(fieldName: Field<T>, value: any): TSelf;

    /**
     *  Matches fields where the value is less than or equal to the specified value
     */
    whereLessThanOrEqual(fieldName: Field<T>, value: any, exact: boolean): TSelf;

    //TBD TSelf WhereLessThanOrEqual<TValue>(Expression<Func<T, TValue>> propertySelector,
    //     TValue value, bool exact = false);

    /**
     * Matches fields which starts with the specified value.
     */
    whereStartsWith(fieldName: Field<T>, value: any): TSelf;

    /**
     * Matches fields which starts with the specified value.
     */
    whereStartsWith(fieldName: Field<T>, value: any, exact: boolean): TSelf;

    //TBD TSelf WhereStartsWith<TValue>(Expression<Func<T, TValue>> propertySelector, TValue value);

    //TBD TSelf WhereExists<TValue>(Expression<Func<T, TValue>> propertySelector);

    /**
     * Check if the given field exists
     */
    whereExists(fieldName: Field<T>): TSelf;

    //TBD TSelf WhereRegex<TValue>(Expression<Func<T, TValue>> propertySelector, string pattern);

    /**
     * Checks value of a given field against supplied regular expression pattern
     */
    whereRegex(fieldName: Field<T>, pattern: string): TSelf;

    //TBD TSelf WithinRadiusOf<TValue>(Expression<Func<T, TValue>> propertySelector, double radius,
    //     double latitude, double longitude, SpatialUnits? radiusUnits = null,
    //     double distanceErrorPct = Constants.Documents.Indexing.Spatial.DefaultDistanceErrorPct);

    /**
     * Filter matches to be inside the specified radius
     */
    withinRadiusOf(fieldName: Field<T>, radius: number, latitude: number, longitude: number): TSelf;

    /**
     * Filter matches to be inside the specified radius
     */
    withinRadiusOf(
        fieldName: Field<T>, radius: number, latitude: number, longitude: number, radiusUnits: SpatialUnits): TSelf;

    /**
     * Filter matches to be inside the specified radius
     */
    withinRadiusOf(
        fieldName: Field<T>,
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
     */
    relatesToShape(fieldName: Field<T>, shapeWkt: string, relation: SpatialRelation): TSelf;

    /**
     * Filter matches based on a given shape - only documents with the shape defined in fieldName that
     * have a relation rel with the given shapeWkt will be returned
     */
    relatesToShape(fieldName: Field<T>, shapeWkt: string, relation: SpatialRelation, distanceErrorPct: number): TSelf;

    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> Spatial(Expression<Func<T, object>> path, Func<SpatialCriteriaFactory, SpatialCriteria> clause);

    /**
     * Ability to use one factory to determine spatial shape that will be used in query.
     */
    spatial(
        fieldName: Field<T>,
        clause: (spatialCriteriaFactory: SpatialCriteriaFactory) => SpatialCriteria): IDocumentQuery<T>;

    spatial(
        field: DynamicSpatialField,
        clause: (spatialCriteriaFactory: SpatialCriteriaFactory) => SpatialCriteria): IDocumentQuery<T>;

    // tslint:disable-next-line:max-line-length
    // TBD IDocumentQuery<T> spatial(Function<SpatialDynamicFieldFactory<T>, DynamicSpatialField> field, Function<SpatialCriteriaFactory, SpatialCriteria> clause);

    moreLikeThis(moreLikeThis: MoreLikeThisBase): IDocumentQuery<T>;

    /**
     * Filter matches based on a given shape - only documents with the shape defined in fieldName that
     * have a relation rel with the given shapeWkt will be returned
     */
    relatesToShape(
        fieldName: Field<T>,
        shapeWkt: string, 
        relation: SpatialRelation, 
        units: SpatialUnits, 
        distanceErrorPct: number): TSelf;
}
