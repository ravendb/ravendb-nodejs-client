import { DatabaseChange } from "./DatabaseChange";
import { ChangesType, IChangesConnectionState } from "./IChangesConnectionState";
import { EventEmitter } from "events";
import { getError } from "../../Exceptions";
import { IDefer } from "../../Utility/PromiseUtil";
import * as PromiseUtil from "../../Utility/PromiseUtil";
import { TypeUtil } from "../../Utility/TypeUtil";

export class DatabaseConnectionState implements IChangesConnectionState<DatabaseChange> {

    private static readonly ERROR_EVENT = "error";

    private _emitter = new EventEmitter();

    public addOnError(handler: (value: Error) => void): void {
        this._emitter.addListener(DatabaseConnectionState.ERROR_EVENT, handler);
    }

    public removeOnError(handler: (value: Error) => void): void {
        this._emitter.removeListener(DatabaseConnectionState.ERROR_EVENT, handler);
    }

    private readonly _onDisconnect: () => Promise<void>;
    public readonly onConnect: () => Promise<void>;

    private _value = 0;
    public lastError: Error;

    private readonly _firstSet: IDefer<void>;

    private _connected: Promise<void>;

    public set(connection: Promise<void>): void {
        if (!this._firstSet.promise.isFulfilled()) {
            connection
                .then(() => {
                    this._firstSet.resolve(undefined);
                })
                .catch(error => {
                    this._firstSet.reject(error);
                });
        } else {
            connection.catch(TypeUtil.NOOP);
        }

        this._connected = connection;
    }

    public inc(): void {
        this._value++;
    }

    public dec(): void {
        this._value--;
        if (!this._value) {
            this.set(this._onDisconnect());
        }
    }

    public error(e: Error): void {
        this.set(Promise.reject(e));
        this.lastError = e;
        this._emitter.emit(DatabaseConnectionState.ERROR_EVENT, e);
    }

    public ensureSubscribedNow(): Promise<void> {
        return this._connected || Promise.resolve(this._firstSet.promise);
    }

    public dispose(): void {
        this.set(Promise.reject(getError("InvalidOperationException",
            "Object was disposed"))); //TODO: ObjectDisposedException?
        this._emitter.removeAllListeners("Document" as ChangesType);
        this._emitter.removeAllListeners("Index" as ChangesType);
        this._emitter.removeAllListeners("Operation" as ChangesType);
        this._emitter.removeAllListeners("Counter" as ChangesType);
        this._emitter.removeAllListeners(DatabaseConnectionState.ERROR_EVENT);
    }

    public constructor(onConnect: () => Promise<void>, onDisconnect: () => Promise<void>) {
        this.onConnect = onConnect;
        this._onDisconnect = onDisconnect;
        this._value = 0;
        this._emitter.setMaxListeners(50);

        this._firstSet = PromiseUtil.defer<void>();
    }

    public addOnChangeNotification(type: ChangesType, handler: (change: DatabaseChange) => void): void {
        this._emitter.addListener(type, handler);
    }

    public removeOnChangeNotification(type: ChangesType, handler: (change: DatabaseChange) => void): void {
        this._emitter.removeListener(type, handler);
    }

    public send(type: ChangesType, change: DatabaseChange) {
        this._emitter.emit(type, change);
    }
}
