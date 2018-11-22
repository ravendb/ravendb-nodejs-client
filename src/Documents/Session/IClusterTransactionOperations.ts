import { ClassConstructor } from "../../Types";
import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue";
import { ErrorFirstCallback } from "../../Types/Callbacks";

export interface IClusterTransactionOperations extends IClusterTransactionOperationsBase {
    
    getCompareExchangeValue<T>(key: string): Promise<CompareExchangeValue<T>>;
    getCompareExchangeValue<T>(key: string, type: ClassConstructor<T>): Promise<CompareExchangeValue<T>>;
    getCompareExchangeValue<T>(
        key: string, 
        callback: ErrorFirstCallback<CompareExchangeValue<T>>): Promise<CompareExchangeValue<T>>;
    getCompareExchangeValue<T>(
        key: string, 
        type: ClassConstructor<T>, 
        callback: ErrorFirstCallback<CompareExchangeValue<T>>): Promise<CompareExchangeValue<T>>;

    getCompareExchangeValues<T>(
        keys: string[]): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        keys: string[], type: ClassConstructor<T>): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        keys: string[], 
        callback: ErrorFirstCallback<{ [key: string]: CompareExchangeValue<T> }>)
            : Promise<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        keys: string[], 
        type: ClassConstructor<T>,
        callback: ErrorFirstCallback<{ [key: string]: CompareExchangeValue<T> }>)
            : Promise<{ [key: string]: CompareExchangeValue<T> }>;
}

export interface IClusterTransactionOperationsBase {
    deleteCompareExchangeValue(key: string, index: number): void;

    deleteCompareExchangeValue<T>(item: CompareExchangeValue<T>): void;

    updateCompareExchangeValue<T>(item: CompareExchangeValue<T>): void;

    createCompareExchangeValue<T>(key: string, item: T): void;
}
