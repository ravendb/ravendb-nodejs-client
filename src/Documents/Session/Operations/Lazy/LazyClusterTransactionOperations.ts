import { ClusterTransactionOperationsBase } from "../../ClusterTransactionOperationsBase";
import { ILazyClusterTransactionOperations } from "../../ILazyClusterTransactionOperations";
import { LazyGetCompareExchangeValueOperation } from "./LazyGetCompareExchangeValueOperation";
import { LazyGetCompareExchangeValuesOperation } from "./LazyGetCompareExchangeValuesOperation";
import { Lazy } from "../../../Lazy";
import { CompareExchangeValue } from "../../../Operations/CompareExchange/CompareExchangeValue";
import { CompareExchangeResultClass } from "../../../../Types";

export class LazyClusterTransactionOperations extends ClusterTransactionOperationsBase implements ILazyClusterTransactionOperations {

    getCompareExchangeValue<T>(key: string): Lazy<CompareExchangeValue<T> | null>;
    getCompareExchangeValue<T>(key: string, type: CompareExchangeResultClass<T>): Lazy<CompareExchangeValue<T> | null>;
    getCompareExchangeValue<T>(key: string, type?: CompareExchangeResultClass<T>): Lazy<CompareExchangeValue<T> | null> {
        return this._session.addLazyOperation(new LazyGetCompareExchangeValueOperation(this, type, this._session.conventions, key));
    }

    getCompareExchangeValues<T>(
        keys: string[]): Lazy<{ [key: string]: CompareExchangeValue<T> | null }>;
    getCompareExchangeValues<T>(
        keys: string[], type: CompareExchangeResultClass<T>): Lazy<{ [key: string]: CompareExchangeValue<T> | null }>
    getCompareExchangeValues<T>(
        keys: string[], type?: CompareExchangeResultClass<T>): Lazy<{ [key: string]: CompareExchangeValue<T> | null }> {
        return this._session.addLazyOperation(new LazyGetCompareExchangeValuesOperation(this, type, this._session.conventions, keys));
    }
}
