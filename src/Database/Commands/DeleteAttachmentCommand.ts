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

export class DeleteAttachmentCommand extends AttachmentCommand {
  public createRequest(serverNode: ServerNode): void {
    super.createRequest(serverNode);
    this._method = RequestMethods.Delete;

    if (this._changeVector) {
      this.headers["If-Match"] = StringUtil.format('"{changeVector}"', this);
    }
  }

  public toRequestOptions(): RavenCommandRequestOptions {
    let options = super.toRequestOptions();

    options.json = true;
    return options;
  }
}