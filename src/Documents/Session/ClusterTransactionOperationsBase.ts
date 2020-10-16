import { TransactionMode } from "./TransactionMode";
import { throwError } from "../../Exceptions";
import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue";
import { ClassConstructor } from "../../Types";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DocumentSession } from "./DocumentSession";
import { CaseInsensitiveKeysMap } from "../../Primitives/CaseInsensitiveKeysMap";
import { CompareExchangeSessionValue } from "../Operations/CompareExchange/CompareExchangeSessionValue";
import { GetCompareExchangeValueOperation, SaveChangesData } from "../..";

export class StoredCompareExchange {
    public readonly entity: any;

    public readonly index: number;

    public constructor(index: number, entity: any) {
        this.entity = entity;
        this.index = index;
    }
}

export abstract class ClusterTransactionOperationsBase {

    protected readonly _session: DocumentSession;
    private readonly _state = CaseInsensitiveKeysMap.create<CompareExchangeSessionValue>();

    public get numberOfTrackedCompareExchangeValues() {
        return this._state.size;
    }

    protected constructor(session: DocumentSession) {
        if (session.transactionMode !== "ClusterWide" as TransactionMode) {
            throwError(
                "InvalidOperationException",
                "This function is part of cluster transaction session, "
                + "in order to use it you have to open the Session with ClusterWide option.");
        }

        this._session = session;
    }

    public get session() {
        return this._session;
    }

    }

    public createCompareExchangeValue<T>(key: string, item: T): CompareExchangeValue<T> {
        if (!key) {
            throwError("InvalidArgumentException", "Key cannot be null");
        }

        let sessionValue: CompareExchangeSessionValue;

        if (!this._tryGetCompareExchangeValueFromSession(key, x => sessionValue = x)) {
            sessionValue = new CompareExchangeSessionValue(key, 0, "None");
            this._state.set(key, sessionValue);
        }

        return sessionValue.create(item);
    }

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
    public clear(): void {
        this._state.clear();
    }

    protected async _getCompareExchangeValueInternal<T>(key: string): Promise<CompareExchangeValue<T>>
    protected async _getCompareExchangeValueInternal<T>(key: string, clazz: ClassConstructor<T>): Promise<CompareExchangeValue<T>>
    protected async _getCompareExchangeValueInternal<T>(key: string, clazz?: ClassConstructor<T>): Promise<CompareExchangeValue<T>> {
        let notTracked: boolean;
        const v = this.getCompareExchangeValueFromSessionInternal<T>(key, t => notTracked = t, clazz);
        if (!notTracked) {
            return v;
        }

        this.session.incrementRequestCount();

        const value = await this.session.operations.send<any>(new GetCompareExchangeValueOperation(key, null, false));
        if (TypeUtil.isNullOrUndefined(value)) {
            this.registerMissingCompareExchangeValue(key);
            return null;
        }

        const sessionValue = this.registerCompareExchangeValue(value);
        if (sessionValue) {
            return sessionValue.getValue(clazz, this.session.conventions);
        }

        return null;
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
    public registerMissingCompareExchangeValue(key: string): CompareExchangeSessionValue {
        const value = new CompareExchangeSessionValue(key, -1, "Missing");
        if (this.session.noTracking) {
            return value;
        }

        this._state.set(key, value);
        return value;
    }

    protected _ensureNotStored(key: string): void {
        if (this._storeCompareExchange && this._storeCompareExchange.has(key)) {
            throwError("InvalidArgumentException",
                `The key '${key}' already exists in the store requests.`);
        }
    }


    public registerCompareExchangeValue(value: CompareExchangeValue<any>): CompareExchangeSessionValue {
        if (this.session.noTracking) {
            return new CompareExchangeSessionValue(value);
        }

        let sessionValue = this._state.get(value.key);

        if (!sessionValue) {
            sessionValue = new CompareExchangeSessionValue(value);
            this._state.set(value.key, sessionValue);
            return sessionValue;
        }

        sessionValue.updateValue(value, this.session.conventions.objectMapper);

        return sessionValue;
    }

    private _tryGetCompareExchangeValueFromSession(key: string, valueSetter: (value: CompareExchangeSessionValue) => void) {
        const value = this._state.get(key);
        valueSetter(value);
        return !TypeUtil.isNullOrUndefined(value);
    }

    public prepareCompareExchangeEntities(result: SaveChangesData) {
        if (!this._state.size) {
            return;
        }

        for (const [key, value] of this._state.entries()) {
            const command = value.getCommand(this.session.conventions);
            if (!command) {
                continue;
            }

            result.sessionCommands.push(command);
        }
    }

    public updateState(key: string, index: number) {
        let sessionValue: CompareExchangeSessionValue;
        if (!this._tryGetCompareExchangeValueFromSession(key, x => sessionValue = x)) {
            return;
        }

        sessionValue.updateState(index);
    }
}
