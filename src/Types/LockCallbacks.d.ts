export interface ILockDoneCallback {
    (err?: Error, ret?: any): void;
}
export declare type ILockCallback = (done: ILockDoneCallback) => any;
