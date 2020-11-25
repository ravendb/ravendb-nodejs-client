import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue";
import { CompareExchangeResultClass } from "../../Types";
import { ClusterTransactionOperationsBase } from "./ClusterTransactionOperationsBase";
import { IClusterTransactionOperations } from "./IClusterTransactionOperations";
import { TypeUtil } from "../../Utility/TypeUtil";
import { LazyClusterTransactionOperations } from "./Operations/Lazy/LazyClusterTransactionOperations";
import { DocumentSession } from "./DocumentSession";

export class ClusterTransactionOperations 
    extends ClusterTransactionOperationsBase 
    implements IClusterTransactionOperations {
    
    public constructor(session: DocumentSession) {
        super(session);
    }

    public get lazily() {
        return new LazyClusterTransactionOperations(this._session);
    }

    public getCompareExchangeValue<T>(key: string): Promise<CompareExchangeValue<T>>;
    public getCompareExchangeValue<T>(key: string, type: CompareExchangeResultClass<T>): Promise<CompareExchangeValue<T>>;
    public async getCompareExchangeValue<T>(
        key: string, 
        type?: CompareExchangeResultClass<T>): Promise<CompareExchangeValue<T>> {

        return this._getCompareExchangeValueInternal(key, type);
    }

    public getCompareExchangeValues<T>(
        keys: string[]): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        keys: string[], type: CompareExchangeResultClass<T>): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        startsWith: string): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        startsWith: string,
        type: CompareExchangeResultClass<T>): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        startsWith: string,
        type: CompareExchangeResultClass<T>,
        start: number): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        startsWith: string,
        type: CompareExchangeResultClass<T>,
        start: number,
        pageSize: number): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        keysOrStartsWith: string[] | string,
        type?: CompareExchangeResultClass<T>,
        start?: number,
        pageSize?: number)
            : Promise<{ [key: string]: CompareExchangeValue<T> }> {

        if (TypeUtil.isArray(keysOrStartsWith)) {
            return this._getCompareExchangeValuesInternal(keysOrStartsWith, type);
        } else {
            return this._getCompareExchangeValuesInternal(keysOrStartsWith, type, start || 0, pageSize ?? 25);
        }
    }
}
