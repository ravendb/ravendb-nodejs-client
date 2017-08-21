import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {IndexQuery} from "../Indexes/IndexQuery";
import {DocumentConventions} from "../../Documents/Conventions/DocumentConventions";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException, IndexDoesNotExistException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {QueryOperators} from "../../Documents/Session/QueryOperator";
import {QueryString} from "../../Http/QueryString";

export class QueryCommand extends RavenCommand {
  protected indexName: string;
  protected indexQuery: IndexQuery;
  protected conventions: DocumentConventions;
  protected metadataOnly: boolean = false;
  protected indexEntriesOnly: boolean = false;

  constructor(indexName: string, indexQuery: IndexQuery, conventions: DocumentConventions, metadataOnly: boolean = false, indexEntriesOnly: boolean = false
  ) {

    super('', RequestMethods.Post, null, null, {});

    if (!indexName) {
      throw new InvalidOperationException('Index name cannot be empty');
    }

    if (!(indexQuery instanceof IndexQuery)) {
      throw new InvalidOperationException('Query must be an instance of IndexQuery class');
    }

    if (!conventions) {
      throw new InvalidOperationException('Document conventions cannot be empty');
    }

    this.indexName = indexName;
    this.indexQuery = indexQuery;
    this.conventions = conventions;
    this.metadataOnly = metadataOnly;
    this.indexEntriesOnly = indexEntriesOnly;
  }

  public createRequest(serverNode: ServerNode): void {
    const query = this.indexQuery;

    this.params = {
      WaitForNonStaleResultsAsOfNow: true,
      PageSize: query.pageSize,
      Start: query.start,
    };


    this.payload = query.toJson();


    this.endPoint = StringUtil.format(
      '{0}/databases/{1}/queries',
      serverNode.url,serverNode.database
    );

    this.metadataOnly && this.addParams('metadata-only', 'true');
    this.indexEntriesOnly && this.addParams('debug', 'entries');
    QueryOperators.isAnd(query.defaultOperator) && this.addParams('operator', query.defaultOperator);

  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    return result;
  }
}