import { ClusterTransactionOperationsBase } from "../../ClusterTransactionOperationsBase";
import { ILazyClusterTransactionOperations } from "../../ILazyClusterTransactionOperations";
import { ClassConstructor, CompareExchangeValue, Lazy } from "../../../..";
import { LazyGetCompareExchangeValueOperation } from "./LazyGetCompareExchangeValueOperation";
import { LazyGetCompareExchangeValuesOperation } from "./LazyGetCompareExchangeValuesOperation";

export class LazyClusterTransactionOperations extends ClusterTransactionOperationsBase implements ILazyClusterTransactionOperations {

    getCompareExchangeValue<T>(key: string): Lazy<CompareExchangeValue<T>>;
    getCompareExchangeValue<T>(key: string, type: ClassConstructor<T>): Lazy<CompareExchangeValue<T>>;
    getCompareExchangeValue<T>(key: string, type?: ClassConstructor<T>): Lazy<CompareExchangeValue<T>> {
        return this._session.addLazyOperation(new LazyGetCompareExchangeValueOperation(this, type, this._session.conventions, key));
    }

    getCompareExchangeValues<T>(
        keys: string[]): Lazy<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        keys: string[], type: ClassConstructor<T>): Lazy<{ [key: string]: CompareExchangeValue<T> }>
    getCompareExchangeValues<T>(
        keys: string[], type?: ClassConstructor<T>): Lazy<{ [key: string]: CompareExchangeValue<T> }> {
        return this._session.addLazyOperation(new LazyGetCompareExchangeValuesOperation(this, type, this._session.conventions, keys));
    }
}