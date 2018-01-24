import {RavenCommandRequestOptions} from '../../Database/RavenCommand';
import {IRavenObject} from '../../Typedef/IRavenObject';
import {IHeaders} from '../IHeaders';
import {StatusCode} from "./StatusCode";

export interface IErrorResponse {
  cause: any;
  error: any;
  options: RavenCommandRequestOptions;
  response: IResponse;
}

export interface IResponse extends IRavenObject {
  statusCode: StatusCode;
  headers: IHeaders;
  body?: IResponseBody | string;
}

export interface IResponseBody extends IRavenObject {
  Message?: string,
  Error?: string,
  Results?: IRavenObject | IRavenObject[],
  ActualchangeVector?: string
}