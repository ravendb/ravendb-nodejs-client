import { Lazy } from "../Lazy.js";
import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue.js";
import { CompareExchangeResultClass } from "../../Types/index.js";

export interface ILazyClusterTransactionOperations {
    getCompareExchangeValue<T>(key: string): Lazy<CompareExchangeValue<T> | null>;
    getCompareExchangeValue<T>(key: string, type: CompareExchangeResultClass<T>): Lazy<CompareExchangeValue<T> | null>;
    getCompareExchangeValue<T>(
        key: string,
        type: CompareExchangeResultClass<T>,
        onEval: (value: CompareExchangeValue<T> | null) => void): Lazy<CompareExchangeValue<T> | null>;

    getCompareExchangeValues<T>(
        keys: string[]): Lazy<{ [key: string]: CompareExchangeValue<T> | null }>;
    getCompareExchangeValues<T>(
        keys: string[], type: CompareExchangeResultClass<T>): Lazy<{ [key: string]: CompareExchangeValue<T> | null }>;
    getCompareExchangeValues<T>(
        keys: string[],
        type: CompareExchangeResultClass<T>,
        onEval: (values: { [key: string]: CompareExchangeValue<T> | null }) => void): Lazy<{ [key: string]: CompareExchangeValue<T> | null }>;

}