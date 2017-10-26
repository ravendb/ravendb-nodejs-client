import * as _ from 'lodash';
import {IRavenObject} from "../Typedef/IRavenObject";
import {TypeUtil} from "../Utility/TypeUtil";
import {IResponse} from "../Http/Response/IResponse";
import {StatusCodes} from "../Http/Response/StatusCode";
import {RavenException} from "../Database/DatabaseExceptions";
import * as exceptions from "../Database/DatabaseExceptions";

export class ExceptionsFactory {
  public static create(message: string): RavenException;
  public static create(type: string, message: string): RavenException;
  public static create(typeOrMessage: string, messageString?: string): RavenException {
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

    return new exceptionCtor(message);
  } 

  public static createFrom(json: object): RavenException | null;
  public static createFrom(response: IResponse): RavenException | null;
  public static createFrom(jsonOrResponse: object | IResponse): RavenException | null {
    if (('headers' in jsonOrResponse) && ('statusCode' in jsonOrResponse)) {
      const response: IResponse = <IResponse>jsonOrResponse;

      if (StatusCodes.isError(response.statusCode) && response.body) {
        return this.createFrom(response.body);
      }
    } else {
      const json: IRavenObject = <IRavenObject><object>jsonOrResponse;
      
      if (json && ('Type' in json) && ('Error' in json)) {        
        if (json.Type && json.Error) {
          return this.create(_.last<string>((json.Type || '').split('.')), json.Error);
        }
      }
    }

    return null;
  }

  public static throw(message: string): never;
  public static throw(type: string, message: string): never;
  public static throw(typeOrMessage: string, messageString?: string): void | never {
    const exception: RavenException = this.create(typeOrMessage, messageString);

    if (!TypeUtil.isNull(exception)) {
      throw exception;
    }    
  }

  public static throwFrom(json: object): void | never;
  public static throwFrom(response: IResponse): void | never;
  public static throwFrom(jsonOrResponse: object | IResponse): void | never {
    const exception: RavenException = this.createFrom(jsonOrResponse);
    
    if (!TypeUtil.isNull(exception)) {
      throw exception;
    }
  }

  private static _exceptionsByType: IRavenObject<typeof RavenException> = <IRavenObject<typeof RavenException>><any>exceptions;
}