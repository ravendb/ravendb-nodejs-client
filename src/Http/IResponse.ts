import {IHash, Hash} from '../Utility/Hash';
import {IHeaders} from './IHeaders';

export interface IResponse extends IHash {
  statusCode: number;
  headers: IHeaders;
  body?: IResponseBody;
}

export interface IResponseBody extends IHash {
  Error?: string,
  Results?: Hash | Hash[]
}