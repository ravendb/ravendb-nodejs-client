import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";

export class GetDocumentCommand extends RavenCommand {
  protected idOrIds?: string | string[];
  protected metadataOnly: boolean = false;
  protected includes?: string[];

  constructor(idOrIds: string | string[], metadataOnly: boolean = false,
    includes?: string[]
  ) {
    super('', RequestMethods.Get, null, null, {});

    this.idOrIds = idOrIds;
    this.includes = includes;
    this.metadataOnly = metadataOnly;
  }

  public createRequest(serverNode: ServerNode): void {
    if (!this.idOrIds) {
      throw new InvalidOperationException('Null ID is not valid');
    }
    
    const ids: string[] = TypeUtil.isArray(this.idOrIds) 
      ? <string[]>this.idOrIds : [<string>this.idOrIds];

    const [firstId] = ids, multiLoad: boolean = (ids.length > 1);  

    this.params = {};
    this.includes && this.addParams('include', this.includes);
    this.endPoint = StringUtil.format('{url}/databases/{database}/docs', serverNode);
    
    if (multiLoad) {
      this.metadataOnly && this.addParams('metadataOnly', 'True');

      if (ids.map((id: string) => id.length)
          .reduce((sum: number, len: number) => sum + len, 0) > 1024
      ) {
        this.payload = {"Ids": ids};
        this._method = RequestMethods.Post;

        return;
      }
    } 

    this.addParams('id', multiLoad ? ids : firstId);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);    

    if (StatusCodes.isNotFound(response.statusCode)) {
      return;
    }

    if (!response.body) {
      throw new ErrorResponseException('Failed to load document from the database \
please check the connection to the server');
    }

    return result;
  }
}