import { ClusterTransactionOperationsBase } from "../../ClusterTransactionOperationsBase.js";
import { ILazyClusterTransactionOperations } from "../../ILazyClusterTransactionOperations.js";
import { LazyGetCompareExchangeValueOperation } from "./LazyGetCompareExchangeValueOperation.js";
import { LazyGetCompareExchangeValuesOperation } from "./LazyGetCompareExchangeValuesOperation.js";
import { Lazy } from "../../../Lazy.js";
import { CompareExchangeValue } from "../../../Operations/CompareExchange/CompareExchangeValue.js";
import { CompareExchangeResultClass } from "../../../../Types/index.js";

export class LazyClusterTransactionOperations extends ClusterTransactionOperationsBase implements ILazyClusterTransactionOperations {

    getCompareExchangeValue<T>(key: string): Lazy<CompareExchangeValue<T> | null>;
    getCompareExchangeValue<T>(key: string, type: CompareExchangeResultClass<T>): Lazy<CompareExchangeValue<T> | null>;
    getCompareExchangeValue<T>(
        key: string,
        type: CompareExchangeResultClass<T>,
        onEval: (value: CompareExchangeValue<T> | null) => void): Lazy<CompareExchangeValue<T> | null>;
    getCompareExchangeValue<T>(
        key: string,
        type?: CompareExchangeResultClass<T>,
        onEval?: (value: CompareExchangeValue<T> | null) => void): Lazy<CompareExchangeValue<T> | null> {
        return this._session.addLazyOperation(new LazyGetCompareExchangeValueOperation(this, type, this._session.conventions, key), onEval);
    }

    getCompareExchangeValues<T>(
        keys: string[]): Lazy<{ [key: string]: CompareExchangeValue<T> | null }>;
    getCompareExchangeValues<T>(
        keys: string[], type: CompareExchangeResultClass<T>): Lazy<{ [key: string]: CompareExchangeValue<T> | null }>
    getCompareExchangeValues<T>(
        keys: string[],
        type: CompareExchangeResultClass<T>,
        onEval: (values: { [key: string]: CompareExchangeValue<T> | null }) => void): Lazy<{ [key: string]: CompareExchangeValue<T> | null }>
    getCompareExchangeValues<T>(
        keys: string[],
        type?: CompareExchangeResultClass<T>,
        onEval?: (values: { [key: string]: CompareExchangeValue<T> | null }) => void): Lazy<{ [key: string]: CompareExchangeValue<T> | null }> {
        return this._session.addLazyOperation(new LazyGetCompareExchangeValuesOperation(this, type, this._session.conventions, keys), onEval);
    }
}
