import { Lazy } from "../Lazy";
import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue";
import { CompareExchangeResultClass } from "../../Types";

export interface ILazyClusterTransactionOperations {
    getCompareExchangeValue<T>(key: string): Lazy<CompareExchangeValue<T>>;
    getCompareExchangeValue<T>(key: string, type: CompareExchangeResultClass<T>): Lazy<CompareExchangeValue<T>>;

    getCompareExchangeValues<T>(
        keys: string[]): Lazy<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        keys: string[], type: CompareExchangeResultClass<T>): Lazy<{ [key: string]: CompareExchangeValue<T> }>;

}