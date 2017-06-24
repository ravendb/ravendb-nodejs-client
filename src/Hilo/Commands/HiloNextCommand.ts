import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from '../../Http/Request/RequestMethod';
import {RavenCommand} from '../../Database/RavenCommand';
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {StringUtil} from "../../Utility/StringUtil";
import {StatusCode, StatusCodes} from "../../Http/Response/StatusCode";
import {ErrorResponseException} from "../../Database/DatabaseExceptions";

export class HiloNextCommand extends RavenCommand {
  protected tag: string;
  protected lastBatchSize: number;
  protected lastRangeAt: Date;
  protected identityPartsSeparator: string;
  protected lastRangeMax: number;

  constructor(tag: string, lastBatchSize: number, lastRangeAt: Date, identityPartsSeparator: string, lastRangeMax: number) {
    super(null, RequestMethods.Get);
    this.tag = tag;
    this.lastBatchSize = lastBatchSize;
    this.lastRangeAt = lastRangeAt;
    this.lastRangeMax = lastRangeMax;
    this.identityPartsSeparator = identityPartsSeparator;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {
      tag: this.tag,
      lastMax: this.lastRangeMax,
      lastBatchSize: this.lastBatchSize,
      lastRangeAt: this.lastRangeAt,
      identityPartsSeparator: this.identityPartsSeparator
    };

    this.endPoint = StringUtil.format('{url}/databases/{database}/hilo/next', serverNode);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    super.setResponse(response);

    let code: StatusCode = response.statusCode;
    let responseBody: IResponseBody = response.body;

    if (StatusCodes.isCreated(code)) {
      return {
        "low": responseBody.Low,
        "high": responseBody.High,
        "prefix": responseBody.Prefix,
        "last_size": responseBody.LastSize,
        "last_range_at": responseBody.LastRangeAt
      };
    }

    throw new ErrorResponseException("Something is wrong with the request");
  }
}