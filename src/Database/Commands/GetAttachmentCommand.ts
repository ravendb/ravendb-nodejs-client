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

    if (AttachmentTypes.isDocument(this._type)) {
      this.method = RequestMethods.Post;
      this.payload = {
        Type: this._type,
        ChangeVector: this._changeVector
      };
    }
  }

  public toRequestOptions(): RavenCommandRequestOptions {
    let options = super.toRequestOptions();

    options.json = false;
    return options;
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const attachment: IRavenResponse = <IRavenResponse>super.setResponse(response);
    const contentType: string = <string>response.headers['Content-Type'] || null;
    const hash: string = <string>response.headers['Attachment-Hash'] || null;
    let changeVector: string = <string>response.headers['Etag'] || null;
    let size: number = 0, sizeString: string = null;

    if (sizeString = <string>response.headers['Attachment-Size']) {
      size = parseInt(sizeString);

      if (isNaN(size) || (size < 0)) {
        size = 0;
      }
    }
    
    if (0 === changeVector.indexOf('"')) {
      changeVector = changeVector.substring(1, changeVector.length - 1);     
    }

    const attachmentDetails: IAttachmentDetails =  {
        contentType, name: this._name,
        hash, size, changeVector,
        documentId: this._documentId
    };

    const result: IAttachmentResult = {
      stream: new Buffer(<string>response.body, 'UTF-8'),
      attachmentDetails
    };

    return <IRavenResponse>result;
  }
}