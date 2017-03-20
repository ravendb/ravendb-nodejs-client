import {ServerNode} from '../../Http/ServerNode';
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/IResponse";
import {DocumentKey} from "../../Documents/IDocument";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {DeleteDocumentCommand} from './DeleteDocumentCommand';
import {InvalidOperationException, ErrorResponseException, FetchConcurrencyException} from "../DatabaseExceptions";

export class PutDocumentCommand extends DeleteDocumentCommand {
  protected document?: Object;

  constructor(key: DocumentKey, document: Object, etag?: number) {
    super(key, etag);

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

  public setResponse(response: IResponse): IRavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body;

    if (!responseBody) {
      throw new ErrorResponseException('Failed to load document from the database \
please check the connection to the server');
    }

    if (responseBody.Error) {
      if (responseBody.ActualEtag) {
        throw new FetchConcurrencyException(responseBody.Error);
      }

      throw new ErrorResponseException(responseBody.Error);
    }
  }
}