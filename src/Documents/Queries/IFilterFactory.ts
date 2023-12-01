import { MethodCall } from "../Session/MethodCall";
import { WhereParams } from "../Session/WhereParams";


export interface IFilterFactory<T> {
    /**
     * Matches value
     * @param fieldName field name
     * @param value value
     */
    equals(fieldName: string, value: any): IFilterFactory<T>;

    /**
     * Matches value
     * @param fieldName field name
     * @param method method
     */
    equals(fieldName: string, method: MethodCall): IFilterFactory<T>;

    /**
     * Matches value
     * @param whereParams where params
     */
    equals(whereParams: WhereParams): IFilterFactory<T>;

    /**
     * Not matches value
     * @param fieldName field name
     * @param value value
     */
    notEquals(fieldName: string, value: any): IFilterFactory<T>;

    /**
     * Not matches value
     * @param fieldName field name
     * @param method method
     */
    notEquals(fieldName: string, method: MethodCall): IFilterFactory<T>;

    /**
     * Not matches value
     * @param whereParams where params
     */
    notEquals(whereParams: WhereParams): IFilterFactory<T>;

    /**
     * Matches fields where the value is greater than the specified value
     * @param fieldName field name
     * @param value value
     */
    greaterThan(fieldName: string, value: any): IFilterFactory<T>;

    /**
     * Matches fields Where the value is greater than or equal to the specified value
     * @param fieldName field name
     * @param value value
     */
    greaterThanOrEqual(fieldName: string, value: any): IFilterFactory<T>;

    /**
     * Matches fields where the value is less than the specified value
     * @param fieldName field name
     * @param value value
     */
    lessThan(fieldName: string, value: any): IFilterFactory<T>;

    /**
     * Matches fields where the value is less than or equal to the specified value
     * @param fieldName field name
     * @param value value
     */
    lessThanOrEqual(fieldName: string, value: any): IFilterFactory<T>;

    /**
     * Simplified method for opening a new clause within the query
     */
    andAlso(): IFilterFactory<T>;

    /**
     * Add an OR to the query
     */
    orElse(): IFilterFactory<T>;

    /**
     * Negate the next operation
     */
    not(): IFilterFactory<T>;

    /**
     * Simplified method for opening a new clause within the query
     */
    openSubclause(): IFilterFactory<T>;

    /**
     *  Simplified method for closing a clause within the query
     */
    closeSubclause(): IFilterFactory<T>;
}
