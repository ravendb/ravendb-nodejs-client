import {RavenCommand, RavenCommandRequestOptions} from '../RavenCommand';
import {AttachmentCommand} from './AttachmentCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ArgumentNullException, ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {AttachmentType, AttachmentTypes} from '../Operations/Attachments/AttachmentType';
import {IAttachmentDetails} from '../Operations/Attachments/AttachmentDetails';
import {IAttachmentResult} from '../Operations/Attachments/AttachmentResult';

export class PutAttachmentCommand extends AttachmentCommand {
  private _stream: Buffer;
  private _contentType?: string;

  constructor(documentId: string, name: string, stream: Buffer, contentType?: string, changeVector?: string) {
    super(documentId, name, changeVector);

    this._stream = stream;
    this._contentType = contentType;

    if (stream.byteLength <= 0) {
      throw new ArgumentNullException('Attachment can\'t be empty');
    }
  }

  public createRequest(serverNode: ServerNode): void {
    super.createRequest(serverNode);

    if (this._changeVector) {
      this.headers["If-Match"] = StringUtil.format('"{changeVector}"', this);
    }

    if (!StringUtil.isNullOrWhiteSpace(this._contentType)) {
      this.params['contentType'] = this._contentType;
    }

    this._method = RequestMethods.Put;
  }

  public toRequestOptions(): RavenCommandRequestOptions {
    let options = super.toRequestOptions();

    options.body = this._stream;
    return options;
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    try {
      response.body = JSON.parse(<string>response.body);
    } catch (exception) {
      response.body = null;
    }

    if (!response.body) {
      throw new ErrorResponseException('Invalid JSON');
    }

    return <IRavenResponse><IAttachmentDetails>super.setResponse(response);    
  }
}