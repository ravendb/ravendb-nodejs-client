import { TransactionMode } from "./TransactionMode";
import { throwError } from "../../Exceptions";
import { CompareExchangeValue } from "../Operations/CompareExchange/CompareExchangeValue";
import { CompareExchangeResultClass } from "../../Types";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DocumentSession } from "./DocumentSession";
import { CaseInsensitiveKeysMap } from "../../Primitives/CaseInsensitiveKeysMap";
import { CompareExchangeSessionValue } from "../Operations/CompareExchange/CompareExchangeSessionValue";
import {
    CompareExchangeResultItem,
    CompareExchangeValueResultParser
} from "../Operations/CompareExchange/CompareExchangeValueResultParser";
import { GetCompareExchangeValueOperation } from "../Operations/CompareExchange/GetCompareExchangeValueOperation";
import { GetCompareExchangeValuesOperation } from "../Operations/CompareExchange/GetCompareExchangeValuesOperation";
import { SaveChangesData } from "../Commands/CommandData";

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

    public isTracked(key: string): boolean {
        return this._tryGetCompareExchangeValueFromSession(key, TypeUtil.NOOP);
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
        let sessionValue: CompareExchangeSessionValue;
        if (!this._tryGetCompareExchangeValueFromSession(key, s => sessionValue = s)) {
            sessionValue = new CompareExchangeSessionValue(key, 0, "None");
            this._state.set(key, sessionValue);
        }

        sessionValue.delete(index);
    }

    public clear(): void {
        this._state.clear();
    }

    protected async _getCompareExchangeValueInternal<T>(key: string): Promise<CompareExchangeValue<T>>
    protected async _getCompareExchangeValueInternal<T>(key: string, clazz: CompareExchangeResultClass<T>): Promise<CompareExchangeValue<T>>
    protected async _getCompareExchangeValueInternal<T>(key: string, clazz?: CompareExchangeResultClass<T>): Promise<CompareExchangeValue<T>> {
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

    protected async _getCompareExchangeValuesInternal<T>(startsWith: string, clazz: CompareExchangeResultClass<T>, start: number, pageSize: number): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    protected async _getCompareExchangeValuesInternal<T>(keys: string[]): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    protected async _getCompareExchangeValuesInternal<T>(keys: string[], clazz: CompareExchangeResultClass<T>): Promise<{ [key: string]: CompareExchangeValue<T> }>;
    protected async _getCompareExchangeValuesInternal<T>(startsWithOrKeys: string | string[], clazz?: CompareExchangeResultClass<T>, start?: number, pageSize?: number): Promise<{ [key: string]: CompareExchangeValue<T> }>{
        if (TypeUtil.isString(startsWithOrKeys)) {
            this.session.incrementRequestCount();

            const values = await this.session.operations.send(new GetCompareExchangeValuesOperation({
                startWith: startsWithOrKeys,
                start,
                pageSize,
                clazz
            }), this.session.sessionInfo);

            const results: Record<string, CompareExchangeValue<T>> = {};

            for (const [key, value] of Object.entries(values)) {
                if (TypeUtil.isNullOrUndefined(value)) {
                    this.registerMissingCompareExchangeValue(key);
                    results[key] = null;
                    continue;
                }

                const sessionValue = this.registerCompareExchangeValue(value);
                results[key] = sessionValue.getValue(clazz, this.session.conventions);
            }

            return results;
        } else {
            let notTrackedKeys: Set<string>;
            const results = this.getCompareExchangeValuesFromSessionInternal(startsWithOrKeys, x => notTrackedKeys = x, clazz);

            if (!notTrackedKeys || !notTrackedKeys.size) {
                return results;
            }

            this._session.incrementRequestCount();

            const keysArray = Array.from(notTrackedKeys);
            const values = await this.session.operations.send(new GetCompareExchangeValuesOperation({
                keys: keysArray,
                clazz
            }), this.session.sessionInfo);

            for (const key of keysArray) {
                const value = values[key];
                if (!value) {
                    this.registerMissingCompareExchangeValue(key);
                    results[key] = null;
                    continue;
                }

                const sessionValue = this.registerCompareExchangeValue(value);
                results[value.key] = sessionValue.getValue(clazz, this.session.conventions);
            }

            return results;
        }
    }

    public getCompareExchangeValueFromSessionInternal<T>(key: string, notTracked: (value: boolean) => void, clazz: CompareExchangeResultClass<T>): CompareExchangeValue<T> {
        let sessionValue: CompareExchangeSessionValue;

        if (this._tryGetCompareExchangeValueFromSession(key, s => sessionValue = s)) {
            notTracked(false);
            return sessionValue.getValue(clazz, this.session.conventions);
        }

        notTracked(true);
        return null;
    }

    public getCompareExchangeValuesFromSessionInternal<T>(keys: string[], notTrackedKeysSetter: (values: Set<string>) => void, clazz: CompareExchangeResultClass<T>): { [key: string]: CompareExchangeValue<T> } {
        let noTrackedKeys: Set<string>;

        const results: { [key: string]: CompareExchangeValue<T> } = {};

        if (!keys || !keys.length) {
            notTrackedKeysSetter(null);
            return {};
        }

        for (const key of keys) {
            let sessionValue: CompareExchangeSessionValue;

            if (this._tryGetCompareExchangeValueFromSession(key, s => sessionValue = s)) {
                results[key] = sessionValue.getValue(clazz, this.session.conventions);
                continue;
            }

            if (!noTrackedKeys) {
                noTrackedKeys = new Set<string>();
            }

            noTrackedKeys.add(key);
        }
        notTrackedKeysSetter(noTrackedKeys);

        return results;
    }

    public registerMissingCompareExchangeValue(key: string): CompareExchangeSessionValue {
        const value = new CompareExchangeSessionValue(key, -1, "Missing");
        if (this.session.noTracking) {
            return value;
        }

        this._state.set(key, value);
        return value;
    }

    public registerCompareExchangeValues(values: Record<string, CompareExchangeResultItem>) {
        if (this.session.noTracking) {
            return;
        }

        if (values) {
            for (const [key, value] of Object.entries(values)) {
                this.registerCompareExchangeValue(CompareExchangeValueResultParser.getSingleValue(value, false, this.session.conventions, null));
            }
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
