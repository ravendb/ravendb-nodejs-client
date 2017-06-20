import * as _ from 'lodash';
import {GetIndexesCommand} from './GetIndexesCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";

export class GetIndexCommand extends GetIndexesCommand {
  protected indexName?: string;

  constructor(indexName: string) {
    super();
    this.indexName = indexName;
  }

  public createRequest(serverNode: ServerNode): void {
    super.createRequest(serverNode);
    this.params = {name: this.indexName};
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse[] = <IRavenResponse[]>super.setResponse(response);

    if (result) {
      return _.first(result) as IRavenResponse;
    }
  }
}