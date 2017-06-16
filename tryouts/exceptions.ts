import * as exceptions from "../src/Database/DatabaseExceptions";
import {RavenException} from "../src/Database/DatabaseExceptions";

interface IRavenObject<T = any> {
    [propery: string]: T;
}

interface IExceptionsDict extends IRavenObject<typeof RavenException> {

}

function throwExceptionFromResponse(json: object): void {
  const jsonDict: IRavenObject<string> = <IRavenObject<string>>json;
  const exceptionsCtors: IExceptionsDict = <IExceptionsDict><any>exceptions;
  let exceptionCtor: typeof RavenException = RavenException;

  Object.keys(exceptionsCtors).some((name: string) => {
    if (jsonDict.Type.includes(name)) {
      exceptionCtor = exceptionsCtors[name];

      return true;
    }
  });

  throw new exceptionCtor(jsonDict.Error);
}

throwExceptionFromResponse({
    "Error": "Raven.Client.Exceptions.Database.DatabaseDoesNotExistException: Database 'DBX' was not found\r\n" + 
      "at Raven.Server.Routing.RouteInformation.ThrowDatabaseDoesNotExist(StringSegment databaseName) in " +
      "C:\\Builds\\RavenDB-4.0-Beta\\src\\Raven.Server\\Routing\\RouteInformation.cs:line 123\r\n   " + 
      "at Raven.Server.Routing.RouteInformation.CreateDatabase(RequestHandlerContext context) in " +
      "C:\\Builds\\RavenDB-4.0-Beta\\src\\Raven.Server\\Routing\\RouteInformation.cs:line 74\r\n   " +
      "at Raven.Server.Routing.RouteInformation.TryGetHandler(RequestHandlerContext context) in " +
      "C:\\Builds\\RavenDB-4.0-Beta\\src\\Raven.Server\\Routing\\RouteInformation.cs:line 132\r\n   " +
      "at async Raven.Server.Routing.RequestRouter.HandlePath(?) in C:\\Builds\\RavenDB-4.0-Beta\\src\\" +
      "Raven.Server\\Routing\\RequestRouter.cs:line 68\r\n   at async Raven.Server.RavenServerStartup.RequestHandler(?) " +
      "in C:\\Builds\\RavenDB-4.0-Beta\\src\\Raven.Server\\RavenServerStartup.cs:line 160",
    "Message": "Database 'DBX' was not found",
    "Type": "Raven.Client.Exceptions.Database.DatabaseDoesNotExistException",
    "Url": "/databases/DBX/docs?id=docs/10"
});

