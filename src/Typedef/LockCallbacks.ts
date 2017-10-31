export interface ILockDoneCallback {
  (err?: Error, ret?: any): void;
}

export type ILockCallback = (done: ILockDoneCallback) => any;