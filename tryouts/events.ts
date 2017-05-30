import * as EventEmitter from "events";

class Observable extends EventEmitter {
  emit<T = void>(event: string | symbol, data?: T): boolean {
    if (data === void 0) {
      return super.emit(event);
    }

    return super.emit(event, data);
  }

  on<T = void>(event: string | symbol, listener: (data?: T) => void): this {
    return super.on(event, listener);
  }
}

class Entity {
  constructor(
    public id: number,
    public subject: string
  ) {}
}

class Session<V> extends Observable {
  constructor(
    protected factory: {new(id: number, subject: string) : V}
  ) {
    super();
  }

  public transaction(): void {
    this.emit('session:start');
    
    const subject1: V = new this.factory(1, 'subject 1');
    this.emit<V>('subject:created', subject1);

    const subject2: V = new this.factory(2, 'subject 2');
    this.emit<V>('subject:created', subject2);

    this.emit('session:end');
  }
}

const session: Session<Entity> = new Session<Entity>(Entity);

session.on('session:start', () => console.log('session:start'));
session.on('session:end', () => console.log('session:end'));
session.on<Entity>('subject:created', (data: Entity) => console.log('subject:created', data));

session.transaction();