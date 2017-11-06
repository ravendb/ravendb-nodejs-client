import * as EventEmitter from "events";

export interface IObservable {
  emit<T = void>(event: string | symbol, data?: T): boolean;
  on<T = void>(event: string | symbol, listener: (data?: T) => void): IObservable;
}

export class Observable extends EventEmitter implements IObservable {
  public emit<T = void>(event: string | symbol, data?: T): boolean {
    if (data === void 0) {
      return super.emit(event);
    }

    return super.emit(event, data);
  }

  public on<T = void>(event: string | symbol, listener: (data?: T) => void): this {
    super.on(event, listener);
    return this;
  }
}