import {IHash, Hash} from '../../Utility/Hash';
import {IHeaders} from '../IHeaders';
import {StatusCode} from "./StatusCode";

export interface IResponse extends IHash {
  statusCode: StatusCode;
  headers: IHeaders;
  body?: IResponseBody;
}

export interface IResponseBody extends IHash {
  Error?: string,
  Results?: Hash | Hash[],
  ActualEtag?: number
}