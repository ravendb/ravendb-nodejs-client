import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {DeleteDocumentCommand} from './DeleteDocumentCommand';
import {InvalidOperationException, ErrorResponseException} from "../DatabaseExceptions";

export class PutDocumentCommand extends DeleteDocumentCommand {
  protected document?: object;

  constructor(id: string, document: object, changeVector?: string) {
    super(id, changeVector);

    this.document = document;
    this.method = RequestMethods.Put;
  }

  public createRequest(serverNode: ServerNode): void {
    if (!this.document) {
      throw new InvalidOperationException('Document must be an object');
    }

    this.payload = this.document;
    super.createRequest(serverNode);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    super.setResponse(response);
    return <IRavenResponse>response.body;
  }

  protected checkResponse(response: IResponse): void {
    if (!response.body) {
      throw new ErrorResponseException('Failed to store document to the database \
please check the connection to the server');
    }
  }
}