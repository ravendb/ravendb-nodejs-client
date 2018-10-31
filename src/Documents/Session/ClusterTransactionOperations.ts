import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue";
import { ClassConstructor } from "../../Types";
import { ClusterTransactionOperationsBase } from "./ClusterTransactionOperationsBase";
import { IClusterTransactionOperations } from "./IClusterTransactionOperations";

export class ClusterTransactionOperations 
    extends ClusterTransactionOperationsBase 
    implements IClusterTransactionOperations {
    
    public constructor(session: InMemoryDocumentSessionOperations) {
        super(session);
    }

    public async getCompareExchangeValue<T>(key: string, type?: ClassConstructor<T>): Promise<CompareExchangeValue<T>> {
        return this._getCompareExchangeValueInternal(key, type);
    }

    public async getCompareExchangeValues<T>(
        keys: string[], type?: ClassConstructor<T>): Promise<{ [key: string]: CompareExchangeValue<T> }> {
        return this._getCompareExchangeValuesInternal(keys, type);
    }
}
