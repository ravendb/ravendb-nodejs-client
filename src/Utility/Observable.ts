import * as EventEmitter from "events";

export class Observable extends EventEmitter {
  emit<T = void>(event: string | symbol, data?: T): boolean {
    if (data === void 0) {
      return super.emit(event);
    }

    return super.emit(event, data);
  }

  on<T = void>(event: string | symbol, listener: (data?: T) => void): this {
    super.on(event, listener);
    return this;
  }
}