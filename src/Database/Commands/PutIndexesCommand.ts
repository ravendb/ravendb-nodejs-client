import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {IndexDefinition} from "../Indexes/IndexDefinition";

export class PutIndexesCommand extends RavenCommand {
  protected indexes?: IndexDefinition[];

  constructor(...indexes: IndexDefinition[]) {
    super('', RequestMethods.Put);

    if (!indexes.length) {
      throw new InvalidOperationException('No indexes specified');
    }

    indexes.forEach((index: IndexDefinition) => {
      if (!(index instanceof IndexDefinition)) {
        throw new InvalidOperationException('All indexes should be instances of IndexDefinition');
      }

      const indexToAdd: IndexDefinition = index as IndexDefinition;

      if (!indexToAdd.name) {
        throw new InvalidOperationException('All indexes should have a name');
      }

      if (!this.indexes) {
        this.indexes = [];
      }

      this.indexes.push(indexToAdd);
    });
  }

  public createRequest(serverNode: ServerNode): void {
    this.endPoint = StringUtil.format('{url}/databases/{database}/indexes', serverNode);
    this.payload = {"Indexes": this.indexes.map((index: IndexDefinition) => index.toJson())};
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const responseBody: IResponseBody = response.body;

    if (!responseBody) {
      throw new ErrorResponseException('Failed to put indexes to the database \
please check the connection to the server');
    }

    if (responseBody.Error) {
      throw new ErrorResponseException(responseBody.Error);
    }

    return responseBody;
  }
}