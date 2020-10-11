import { ClassConstructor, CompareExchangeValue, ErrorFirstCallback, Lazy } from "../..";

export interface ILazyClusterTransactionOperations {
    getCompareExchangeValue<T>(key: string): Lazy<CompareExchangeValue<T>>;
    getCompareExchangeValue<T>(key: string, type: ClassConstructor<T>): Lazy<CompareExchangeValue<T>>;

    getCompareExchangeValues<T>(
        keys: string[]): Lazy<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        keys: string[], type: ClassConstructor<T>): Lazy<{ [key: string]: CompareExchangeValue<T> }>;

}