import {IRavenObject} from "../Typedef/IRavenObject";
import {IResponse} from "../Http/Response/IResponse";
import {StatusCodes} from "../Http/Response/StatusCode";
import {RavenException} from "../Database/DatabaseExceptions";
import * as exceptions from "../Database/DatabaseExceptions";

export class ExceptionThrower {
  public static throw(message: string): never;
  public static throw(type: string, message: string): never;
  public static throw(typeOrMessage: string, messageString?: string): never {
    let exceptionCtor: typeof RavenException = RavenException;
    let message: string = typeOrMessage;

    if (typeOrMessage && messageString) {
      message = messageString;

      Object.keys(this._exceptionsByType).some((name: string) => {
        if (typeOrMessage.includes(name)) {
          exceptionCtor = this._exceptionsByType[name];

          return true;
        }
      });
    }

    throw new exceptionCtor(message);
  }

  public static throwFrom(json: object): void;
  public static throwFrom(response: IResponse): void;
  public static throwFrom(jsonOrResponse: object | IResponse): void {
    if (('headers' in jsonOrResponse) && ('statusCode' in jsonOrResponse)) {
      const response: IResponse = <IResponse>jsonOrResponse;

      if (StatusCodes.isError(response.statusCode) && response.body) {
        this.throwFrom(response.body);

      }
    } else {
      const json: IRavenObject = <IRavenObject><object>jsonOrResponse;

      if (json && ('Type' in json) && ('Error' in json)) {
        if (json.Type && json.Error) {
          this.throw(json.Type, json.Error);
        }
      }
    }
  }

  private static _exceptionsByType: IRavenObject<typeof RavenException> = <IRavenObject<typeof RavenException>><any>exceptions;
}