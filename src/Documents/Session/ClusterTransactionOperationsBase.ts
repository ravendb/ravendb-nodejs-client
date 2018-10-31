import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { TransactionMode } from "./TransactionMode";
import { throwError } from "../../Exceptions";
import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue";
import { ClassConstructor } from "../../Types";
import { GetCompareExchangeValueOperation } from "../Operations/CompareExchange/GetCompareExchangeValueOperation";
import { GetCompareExchangeValuesOperation } from "../Operations/CompareExchange/GetCompareExchangeValuesOperation";
import { TypeUtil } from "../../Utility/TypeUtil";

export class StoredCompareExchange {
    public readonly entity: any;

    public readonly index: number;

    public constructor(index: number, entity: any) {
        this.entity = entity;
        this.index = index;
    }
}

export abstract class ClusterTransactionOperationsBase {

    private readonly _session: InMemoryDocumentSessionOperations;

    private _storeCompareExchange: Map<string, StoredCompareExchange>;

    public get storeCompareExchange(): Map<string, StoredCompareExchange> {
        return this._storeCompareExchange;
    }

    private _deleteCompareExchange: Map<string, number>;

    public get deleteCompareExchange(): Map<string, number> {
        return this._deleteCompareExchange;
    }

    public hasCommands(): boolean {
        return !!(this._deleteCompareExchange || this._storeCompareExchange);
    }

    public constructor(session: InMemoryDocumentSessionOperations) {
        if (session.transactionMode !== "ClusterWide" as TransactionMode) {
            throwError(
                "InvalidOperationException",
                "This function is part of cluster transaction session, "
                + "in order to use it you have to open the Session with ClusterWide option.");
        }

        this._session = session;
    }

    public createCompareExchangeValue<T>(key: string, item: T): void {
        if (!this._storeCompareExchange) {
            this._storeCompareExchange = new Map();
        }

        this._ensureNotDeleted(key);
        this._ensureNotStored(key);
        this._storeCompareExchange.set(key, new StoredCompareExchange(0, item));
    }
    public updateCompareExchangeValue<T>(item: CompareExchangeValue<T>): void {
        this._ensureNotDeleted(item.key);
        if (!this._storeCompareExchange) {
            this._storeCompareExchange = new Map();
        }
        this._storeCompareExchange.set(item.key, new StoredCompareExchange(item.index, item.value));
    }
    //     this._ensureNotStored(item.key);
    //     if (!this._deleteCompareExchange) {
    //         this._deleteCompareExchange = new Map();
    //     }

    //     this._deleteCompareExchange.set(item.key, item.index);
    // }

    public deleteCompareExchangeValue(key: string, index: number): void;
    public deleteCompareExchangeValue<T>(item: CompareExchangeValue<T>): void;
    public deleteCompareExchangeValue<T>(keyOrItem: string | CompareExchangeValue<T>, index?: number): void {

        if (!TypeUtil.isString(keyOrItem)) {
            return this.deleteCompareExchangeValue(keyOrItem.key, keyOrItem.index);
        }

        const key = keyOrItem as string;
        this._ensureNotStored(key);
        if (!this._deleteCompareExchange) {
            this._deleteCompareExchange = new Map();
        }

        this._deleteCompareExchange.set(key, index);
    }

    public clear() {
        this._deleteCompareExchange = null;
        this._storeCompareExchange = null;
    }

    protected async _getCompareExchangeValueInternal<T>(
        key: string, type?: ClassConstructor<T>): Promise<CompareExchangeValue<T>> {
        const getValueOp = new GetCompareExchangeValueOperation(key, type);
        return this._session.operations.send(getValueOp, this._session.sessionInfo);
    }

    protected _getCompareExchangeValuesInternal<T>(
        keys: string[], type?: ClassConstructor<T>): Promise<{ [key: string]: CompareExchangeValue<T> }> {
        const op = new GetCompareExchangeValuesOperation({
            keys,
            clazz: type
        });
        return this._session.operations.send(op, this._session.sessionInfo);
    }

    protected _ensureNotDeleted(key: string): void {
        if (this._deleteCompareExchange && this._deleteCompareExchange.has(key)) {
            throwError("InvalidArgumentException",
                `The key '${key}' already exists in the deletion requests.`);
        }
    }

    protected _ensureNotStored(key: string): void {
        if (this._storeCompareExchange && this._storeCompareExchange.has(key)) {
            throwError("InvalidArgumentException",
                `The key '${key}' already exists in the store requests.`);
        }
    }

}
