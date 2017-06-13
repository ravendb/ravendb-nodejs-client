interface IRavenObject<T = any> {
  [propery: string]: T;
}

class RavenCommand {
  public setResponse(json: IRavenObject): IRavenObject;
  public setResponse(json: IRavenObject): IRavenObject[];
  public setResponse(json: IRavenObject): void;
  public setResponse(json: IRavenObject): IRavenObject | IRavenObject[] | void {
    if (json.success) {
      return Array.isArray(json.data)
        ? <IRavenObject[]>json.data
        : <IRavenObject>json.data;
    }
  }
}

class RequestsExecutor {
  public execute(command: RavenCommand, fakeData: IRavenObject): Promise<IRavenObject>;
  public execute(command: RavenCommand, fakeData: IRavenObject): Promise<IRavenObject[]>;
  public execute(command: RavenCommand, fakeData: IRavenObject): Promise<void>;
  public execute(command: RavenCommand, fakeData: IRavenObject): Promise<IRavenObject | IRavenObject | void> {
    return Promise.resolve(command.setResponse(fakeData));  
  }
}

class App {
  public static main(argv?: string[], argc: number = 0): void {
    const dummyDoc: IRavenObject = {id: 1, title: 'some title'};
    let executor: RequestsExecutor = new RequestsExecutor();
  
    executor.execute(new RavenCommand(), {success: true, data: dummyDoc})
      .then((response: IRavenObject) => console.log(response));

    executor.execute(new RavenCommand(), {success: true, data: [dummyDoc, dummyDoc]})
      .then((response: IRavenObject[]) => console.log(response));

    executor.execute(new RavenCommand(), {success: false})
      .then(() => console.log('no response'));  
  }
}

App.main();