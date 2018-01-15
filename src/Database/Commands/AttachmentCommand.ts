import {RavenCommand, RavenCommandRequestOptions} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ArgumentNullException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";

export abstract class AttachmentCommand extends RavenCommand {
  protected _documentId: string;
  protected _name: string;
  protected _changeVector: string;

  constructor(documentId: string, name: string, changeVector?: string) {
    super('', RequestMethods.Get);

    if (StringUtil.isNullOrWhiteSpace(documentId)) {
      throw new ArgumentNullException('Document ID can\'t be empty');
    }

    if (StringUtil.isNullOrWhiteSpace(name)) {
      throw new ArgumentNullException('Document name can\'t be empty');
    }

    this._documentId = documentId;
    this._name = name;
    this._changeVector = changeVector;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {
      id: this._documentId,
      name: this._name
    };

    this.endPoint = StringUtil.format('{url}/databases/{database}/attachments', serverNode);
  }
}