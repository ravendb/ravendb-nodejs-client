import { ClassConstructor } from "../../Types";
import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue";
import { ILazyClusterTransactionOperations } from "./ILazyClusterTransactionOperations";

export interface IClusterTransactionOperations extends IClusterTransactionOperationsBase {
    
    getCompareExchangeValue<T>(key: string): Promise<CompareExchangeValue<T>>;
    getCompareExchangeValue<T>(key: string, type: ClassConstructor<T>): Promise<CompareExchangeValue<T>>;

    getCompareExchangeValues<T>(
        keys: string[]): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        keys: string[], type: ClassConstructor<T>): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        startsWith: string): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        startsWith: string,
        type: ClassConstructor<T>): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        startsWith: string,
        type: ClassConstructor<T>,
        start: number): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    getCompareExchangeValues<T>(
        startsWith: string,
        type: ClassConstructor<T>,
        start: number,
        pageSize: number): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    
    lazily: ILazyClusterTransactionOperations;
}

export interface IClusterTransactionOperationsBase {
    deleteCompareExchangeValue(key: string, index: number): void;

    deleteCompareExchangeValue<T>(item: CompareExchangeValue<T>): void;

    createCompareExchangeValue<T>(key: string, item: T): CompareExchangeValue<T>;
}
