export interface IObject<T = any> {
    [propery: string]: T;
}

class Store {
  public openSession(): Session;
  public async openSession(transaction: (session: Session) => Promise<void>): Promise<void>;
  public openSession(transaction?: (session: Session) => Promise<void>): Session | Promise<void> {
    const session: Session = new Session();
    
    if (!transaction) {
      return session;
    }

    return transaction(session.initialize())
      .then(() => session.saveChanges())
      .then(() => this.finalize());
  }

  public async finalize(): Promise<void> {
    console.log('finalize');
    return Promise.resolve();
  }
}

class Session {
  protected initialized = false;

  public initialize(): Session {
    console.log('initialize');
    this.initialized = true;

    return this;
  }

  public create<T extends object = IObject>(json: object): T {
    this.assertInitialize();
    return json as T; 
  }

  public async load<T extends object = IObject>(id: string): Promise<T> {    
    let entity: T = {} as T;
    (entity as IObject).id = parseInt(id);

    this.assertInitialize();    
    console.log('load', id);
    return Promise.resolve<T>(entity);
  }

  public async store<T extends object = IObject>(entity: T): Promise<T> {
    this.assertInitialize();
    console.log('store', entity);
    return Promise.resolve<T>(entity);
  }

  public async saveChanges(): Promise<void> {
    this.assertInitialize();
    console.log('save changes');
    return Promise.resolve();
  }

  protected assertInitialize(): void {
    if (!this.initialized) {
      throw new Error('Not initialized');
    }
  }
}

class Runner
{
  public static async run(): Promise<void> {
    const store = new Store();
    const session = store.openSession();
    let doc1: IObject, doc2: IObject;

    session.initialize();
    doc1 = session.create({id:1});
    doc2 = await session.load('2');

    doc1 = await session.store(doc1);
    doc2 = await session.store(doc2);    

    await session.saveChanges();
    await store.finalize();

    console.log('doc1', doc1);
    console.log('doc2', doc2);

    await store.openSession(async (session: Session): Promise<void> => {
      doc1 = session.create({id:1});
      doc2 = await session.load('2');

      doc1 = await session.store(doc1);
      doc2 = await session.store(doc2);    
    });

    console.log('doc1', doc1);
    console.log('doc2', doc2);
  }
}

Runner.run().then(() => console.log('DONE'));