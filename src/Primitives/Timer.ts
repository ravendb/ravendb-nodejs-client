import * as BluebirdPromise from "bluebird";
import {IDisposable} from "../Typedef/Contracts";

export class Timer implements IDisposable {

    private _action: () => PromiseLike<any>;
    
    private _scheduledActionPromise: PromiseLike<any>;

    private _timerId: NodeJS.Timer;

    private _intervalTimerId: NodeJS.Timer;

    /** period in milliseconds */
    private _periodInMs: number;

    constructor(action: () => PromiseLike<any>, dueTimeInMs: number, periodInMs?: number) {
        this._action = action;
        this._periodInMs = periodInMs;
        this._schedule(dueTimeInMs);
    }

    public change(dueTimeInMs: number, period?: number) {
        this._periodInMs = period;
        clearTimeout(this._timerId);
        this._schedule(dueTimeInMs);
    }

    private _schedule(dueTimeInMs: number) {
        this._timerId = setTimeout(() => {

            if (this._periodInMs) {
                this._schedule(this._periodInMs);
            } 

            this._scheduledActionPromise = this._action();            
        }, dueTimeInMs);
    }

    public dispose(): void {
        if (this._scheduledActionPromise) {
            clearTimeout(this._timerId);
        }
    }
}
