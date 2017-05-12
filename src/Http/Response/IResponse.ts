import {IRavenObject} from '../../Database/IRavenObject';
import {IHeaders} from '../IHeaders';
import {StatusCode} from "./StatusCode";

export interface IResponse extends IRavenObject {
  statusCode: StatusCode;
  headers: IHeaders;
  body?: IResponseBody;
}

export interface IResponseBody extends IRavenObject {
  Message?: string,
  Error?: string,
  Results?: IRavenObject | IRavenObject[],
  ActualEtag?: number
}