import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RavenCommandResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {IndexDefinition} from "../Indexes/IndexDefinition";

export class PutIndexesCommand extends RavenCommand {
  protected indexes?: Object[];

  constructor(...indexes: IndexDefinition[]) {
    super('', RequestMethods.Put);

    if (!indexes.length) {
      throw new InvalidOperationException('No indexes specified');
    }

    indexes.forEach((index: IndexDefinition) => {
      if (index instanceof IndexDefinition) {
        throw new InvalidOperationException('All indexes should be instances of IndexDefinition');
      }
      if (!(index as IndexDefinition).name) {
        throw new InvalidOperationException('All indexes should have a name');
      }

      this.indexes.push((index as IndexDefinition).toJson());
    });
  }

  public createRequest(serverNode: ServerNode): void {
    this.endPoint = StringUtil.format('{url}/databases/{database}/indexes', serverNode);
    this.payload = this.indexes;
  }

  public setResponse(response: IResponse): RavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body as IResponseBody;

    if (!responseBody) {
      throw new ErrorResponseException('Failed to put indexes to the database \
please check the connection to the server');
    }

    if (responseBody.Error) {
      throw new ErrorResponseException(responseBody.Error);
    }

    return responseBody as RavenCommandResponse;
  }
}