import {RavenCommand, RavenCommandRequestOptions} from '../RavenCommand';
import {AttachmentCommand} from './AttachmentCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ArgumentNullException, ErrorResponseException, InvalidOperationException, DocumentDoesNotExistException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {AttachmentType, AttachmentTypes} from '../Operations/Attachments/AttachmentType';
import {IAttachmentDetails} from '../Operations/Attachments/AttachmentDetails';
import {IAttachmentResult} from '../Operations/Attachments/AttachmentResult';
import { IHeaders } from '../../Http/IHeaders';

export class GetAttachmentCommand extends AttachmentCommand {
  private _type: AttachmentType;

  constructor(documentId: string, name: string, type: AttachmentType, changeVector?: string) {
    super(documentId, name, changeVector);

    if (!AttachmentTypes.isDocument(type) && TypeUtil.isNull(changeVector)) {
      throw new ArgumentNullException("Change Vector cannot be null for non-document attachment type");
    }

    this._type = type;
  }

  public createRequest(serverNode: ServerNode): void {
    super.createRequest(serverNode);

    if (!AttachmentTypes.isDocument(this._type)) {
      this.method = RequestMethods.Post;
      this.headers['Content-Type'] = 'application/json';
    }
  }

  public toRequestOptions(): RavenCommandRequestOptions {
    let options = super.toRequestOptions();

    if (!AttachmentTypes.isDocument(this._type)) {
      options.body = JSON.stringify({
        Type: this._type,
        ChangeVector: this._changeVector
      });
    }

    options.encoding = null;
    return options;
  }  

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    if (StatusCodes.isNotFound(response.statusCode)) {
      throw new DocumentDoesNotExistException('Attachment does not exists');
    }

    super.setResponse(response);

    const attachment: Buffer = <Buffer>response.body;
    const contentType: string = this.tryReadHeader('Content-Type');
    const hash: string = this.tryReadHeader('Attachment-Hash');
    let changeVector: string = this.tryReadHeader('Etag');
    let size: number = 0, sizeString: string = null;

    if (sizeString = this.tryReadHeader('Attachment-Size')) {
      size = parseInt(sizeString);

      if (isNaN(size) || (size < 0)) {
        size = 0;
      }
    }
    
    if (0 === changeVector.indexOf('"')) {
      changeVector = changeVector.substring(1, changeVector.length - 1);     
    }

    const attachmentDetails: IAttachmentDetails = {
        contentType, name: this._name,
        hash, size, changeVector,
        documentId: this._documentId
    };

    const result: IAttachmentResult = {
      stream: attachment,
      attachmentDetails
    };

    return <IRavenResponse>result;
  }

  protected tryReadHeader(header: string): string | null {
    const headers: IHeaders = this._lastResponse.headers;

    return ((headers[header] || headers[header.toLowerCase()]) as string) || null;
  }
}