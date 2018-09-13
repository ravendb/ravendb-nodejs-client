import {ChangesType, IChangesConnectionState} from "./IChangesConnectionState";
import {IChangesObservable} from "./IChangesObservable";

export class ChangesObservable<T, TConnectionState extends IChangesConnectionState<any>>
    implements IChangesObservable<T> {

    private readonly _type: ChangesType;
    private readonly _connectionState: TConnectionState;
    private readonly _filter: (val: T) => boolean;
    private readonly _subscribers: Set<(value: T) => void> = new Set();
    private readonly _errorSubscribers: Set<(error: Error) => void> = new Set();

    private _sendHandler: (val: T) => void;
    private _errorHandler: (val: Error) => void;

    public constructor(type: ChangesType, connectionState: TConnectionState, filter: (val: T) => boolean) {
        this._type = type;
        this._connectionState = connectionState;
        this._filter = filter;
    }

    public on(event: "data", handler: (value: T) => void);
    public on(event: "error", handler: (error: Error) => void);
    public on(event: "data" | "error", handler: ((value: T) => void) | ((error: Error) => void)) {
        switch (event) {
            case "data":
                // since allow multiple subscriptions on single object we cant register it multiple times
                // to avoid duplicates in notification
                if (!this._sendHandler) {
                    // register shared handler
                    this._sendHandler = (payload: T) => this.send(payload);
                    this._connectionState.addOnChangeNotification(this._type, this._sendHandler);
                }

                this._subscribers.add(handler as (value: T) => void);
                this._connectionState.inc();
                break;
            case "error":
                if (!this._errorHandler) {
                    // register shared error handler
                    this._errorHandler = (ex: Error) => this.error(ex);
                    this._connectionState.addOnError(this._errorHandler);
                }

                this._errorSubscribers.add(handler as (error: Error) => void);
                break;
        }
    }

    public removeListener(event: "data", handler: (value: T) => void);
    public removeListener(event: "error", handler: (error: Error) => void);
    public removeListener(event: "data" | "error", handler: ((value: T) => void) | ((error: Error) => void)) {
        this.off(event as any, handler as any);
    }

    public off(event: "data", handler: (value: T) => void);
    public off(event: "error", handler: (error: Error) => void);
    public off(event: "data" | "error", handler: ((value: T) => void) | ((error: Error) => void)) {

        this._connectionState.dec();

        switch (event) {
            case "data":
                this._subscribers.delete(handler as (value: T) => void);
                if (!this._subscribers.size) {
                    // no more subscribers left - remove from parent
                    this._connectionState.removeOnChangeNotification(this._type, this._sendHandler);
                    this._sendHandler = undefined;
                }

                break;
            case "error":
                this._errorSubscribers.delete(handler as (error: Error) => void);
                if (!this._errorSubscribers.size) {
                    this._connectionState.removeOnError(this._errorHandler);
                    this._errorHandler = undefined;
                }
                break;
        }
    }

    public send(msg: T): void {
        try {
            if (!this._filter(msg)) {
                return;
            }
        } catch (e) {
            this.error(e);
            return;
        }

        this._subscribers.forEach(x => x(msg));
    }

    public error(e: Error): void {
        this._errorSubscribers.forEach(x => x(e));
    }

    public ensureSubscribedNow(): Promise<void> {
        return this._connectionState.ensureSubscribedNow();
    }
}
