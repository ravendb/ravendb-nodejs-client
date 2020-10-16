import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue";
import { ClassConstructor } from "../../Types";
import { ClusterTransactionOperationsBase } from "./ClusterTransactionOperationsBase";
import { IClusterTransactionOperations } from "./IClusterTransactionOperations";
import { ErrorFirstCallback } from "../../Types/Callbacks";
import { TypeUtil } from "../../Utility/TypeUtil";
import { passResultToCallback } from "../../Utility/PromiseUtil";
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
    public getCompareExchangeValue<T>(key: string, type: ClassConstructor<T>): Promise<CompareExchangeValue<T>>;
    public getCompareExchangeValue<T>(
        key: string,
        callback: ErrorFirstCallback<CompareExchangeValue<T>>): Promise<CompareExchangeValue<T>>;
    public getCompareExchangeValue<T>(
        key: string, 
        type: ClassConstructor<T>, 
        callback: ErrorFirstCallback<CompareExchangeValue<T>>): Promise<CompareExchangeValue<T>>;
    public async getCompareExchangeValue<T>(
        key: string, 
        typeOrCallback?: ClassConstructor<T> | ErrorFirstCallback<CompareExchangeValue<T>>, 
        callback?: ErrorFirstCallback<CompareExchangeValue<T>>): Promise<CompareExchangeValue<T>> {

        callback = callback || TypeUtil.NOOP;
        let resultPromise: Promise<CompareExchangeValue<T>>;
        if (TypeUtil.isClass(typeOrCallback)) {
            resultPromise = this._getCompareExchangeValueInternal(key, typeOrCallback as ClassConstructor<T>);
        } else {
            resultPromise = this._getCompareExchangeValueInternal(key);
        }

        passResultToCallback(resultPromise, callback);
        return resultPromise;
    }

    public getCompareExchangeValues<T>(
        keys: string[]): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        keys: string[], type: ClassConstructor<T>): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        keys: string[], 
        callback: ErrorFirstCallback<{ [key: string]: CompareExchangeValue<T> }>)
            : Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        keys: string[], 
        type: ClassConstructor<T>,
        callback: ErrorFirstCallback<{ [key: string]: CompareExchangeValue<T> }>)
            : Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        startsWith: string): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        startsWith: string,
        type: ClassConstructor<T>): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        startsWith: string,
        type: ClassConstructor<T>,
        start: number): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        startsWith: string,
        type: ClassConstructor<T>,
        start: number,
        pageSize: number): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    public getCompareExchangeValues<T>(
        keysOrStartsWith: string[] | string,
        typeOrCallback?: ClassConstructor<T> | ErrorFirstCallback<{ [key: string]: CompareExchangeValue<T> }>,
        callbackOrStart?: ErrorFirstCallback<{ [key: string]: CompareExchangeValue<T> }> | number,
        pageSize?: number)
            : Promise<{ [key: string]: CompareExchangeValue<T> }> {

        if (TypeUtil.isArray(keysOrStartsWith)) {
            const keys = keysOrStartsWith;
            callbackOrStart = callbackOrStart || TypeUtil.NOOP;
            let resultPromise: Promise<{ [key: string]: CompareExchangeValue<T> }>;
            if (TypeUtil.isClass(typeOrCallback)) {
                resultPromise = this._getCompareExchangeValuesInternal(keys, typeOrCallback as ClassConstructor<T>);
            } else {
                resultPromise = this._getCompareExchangeValuesInternal(keys);
            }

            passResultToCallback(resultPromise, callbackOrStart as ErrorFirstCallback<any>);
            return resultPromise;
        } else {
            const startsWith = keysOrStartsWith;
            const type = typeOrCallback as ClassConstructor<T>;
            const start = (callbackOrStart as number) || 0;
            pageSize = pageSize ?? 25;

            return this._getCompareExchangeValuesInternal(startsWith, type, start, pageSize);
        }
    }
}
