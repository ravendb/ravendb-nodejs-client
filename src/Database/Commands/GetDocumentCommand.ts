import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RavenCommandResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {DocumentKey} from "../../Documents/IDocument";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";

export class GetDocumentCommand extends RavenCommand {
  protected keyOrKeys?: DocumentKey | DocumentKey[];
  protected includes?: string[];
  protected metadataOnly: boolean = false;
  protected forceReadFromMaster: boolean = false;

  constructor(keyOrKeys: DocumentKey | DocumentKey[], includes?: string[],
    metadataOnly: boolean = false, forceReadFromMaster: boolean = false
  ) {
    super('', RequestMethods.Get, null, null, {}, true);

    this.keyOrKeys = keyOrKeys;
    this.includes = includes;
    this.metadataOnly = metadataOnly;
    this.forceReadFromMaster = forceReadFromMaster;
  }

  public createRequest(serverNode: ServerNode): void {
    if (!this.keyOrKeys) {
      throw new InvalidOperationException('Null Key is not valid');
    }

    this.params = {};
    this.endPoint = StringUtil.format('{url}/databases/{database}/docs', serverNode);
    this.includes && this.addParams('includes', this.includes);

    if (TypeUtil.isArray(this.keyOrKeys)) {
      this.metadataOnly && this.addParams('metadata-only', 'True');

      if ((this.keyOrKeys as DocumentKey[]).map((key: DocumentKey) => key.length)
          .reduce((sum: number, len: number) => sum + len) > 1024
      ) {
        this.payload = this.keyOrKeys;
        this.method = RequestMethods.Post;
      } else {
        this.addParams('id', this.keyOrKeys as DocumentKey[]);
      }
    } else {
      this.addParams('id', this.keyOrKeys as DocumentKey);
    }
  }

  public setResponse(response: IResponse): RavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body;

    if (!responseBody) {
      throw new ErrorResponseException('Failed to load document from the database \
please check the connection to the server');
    }

    if (responseBody.Error) {
      throw new ErrorResponseException(responseBody.Error);
    }

    return responseBody as RavenCommandResponse;
  }
}