import { ClassConstructor } from "../../Types";
import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue";

export interface IClusterTransactionOperations extends IClusterTransactionOperationsBase {
    
    getCompareExchangeValue<T>(key: string, type?: ClassConstructor<T>): Promise<CompareExchangeValue<T>>;

    getCompareExchangeValues<T>(
        keys: string[], type?: ClassConstructor<T>): Promise<{ [key: string]: CompareExchangeValue<T> }>;
}

export interface IClusterTransactionOperationsBase {
    deleteCompareExchangeValue(key: string, index: number): void;

    deleteCompareExchangeValue<T>(item: CompareExchangeValue<T>): void;

    updateCompareExchangeValue<T>(item: CompareExchangeValue<T>): void;

    createCompareExchangeValue<T>(key: string, item: T): void;
}
