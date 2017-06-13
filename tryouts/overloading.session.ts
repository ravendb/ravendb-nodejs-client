const docs = {
  key1: {a: 1, b: 2},
  key2: {a: 1, b: 2}
};

interface ISession {
  load(key: string): Object;
  load(key: string[]): Object[];
}

class Session implements ISession {
  load(key: string): Object;
  load(key: string[]): Object[];
  load(key: string | string[]): Object | Object[] {
    if ('string' == typeof key) {
        return docs[key];
    }

    return key.map((key: string) => docs[key]);     
  }
}

class App {
  public static main(argv?: string): void {
    const session = new Session();
    const document: Object = session.load('key1');
    const documents: Object[] = session.load(['key1', 'key2']);

    console.log(document);   
    console.log(documents);   
  }
}

App.main();