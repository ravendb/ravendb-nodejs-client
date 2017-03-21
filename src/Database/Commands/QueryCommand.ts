import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {IndexQuery} from "../Indexes/IndexQuery";
import {DocumentConventions} from "../../Documents/Conventions/DocumentConventions";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {IDocument} from "../../Documents/IDocument";
import {InvalidOperationException, ErrorResponseException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {QueryOperators} from "../../Documents/Session/QueryOperator";
import {QueryString} from "../../Http/QueryString";

export class QueryCommand extends RavenCommand {
  protected indexName: string;
  protected indexQuery: IndexQuery;
  protected conventions: DocumentConventions<IDocument>;
  protected includes?: string[];
  protected metadataOnly: boolean = false;
  protected indexEntriesOnly: boolean = false;
  protected forceReadFromMaster: boolean = false;

  constructor(indexName: string, indexQuery: IndexQuery, conventions: DocumentConventions<IDocument>,
    includes?: string[], metadataOnly: boolean = false, indexEntriesOnly: boolean = false,
    forceReadFromMaster: boolean = false
  ) {
    super('', RequestMethods.Get, null, null, {}, true);

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
    this.includes = includes;
    this.metadataOnly = metadataOnly;
    this.indexEntriesOnly = indexEntriesOnly;
    this.forceReadFromMaster = forceReadFromMaster;
  }

  public createRequest(serverNode: ServerNode): void {
    const query = this.indexQuery;

    this.params = {pageSize: query.pageSize};
    this.endPoint = StringUtil.format(
      '{0}/databases/{1}/queries/{2}',
      serverNode.url, serverNode.database,
      encodeURIComponent(this.indexName)
    );

    query.query && this.addParams('query', query.query);
    query.fetch && this.addParams('fetch', query.fetch);
    this.includes && this.addParams('include', this.includes);
    this.metadataOnly && this.addParams('metadata-only', 'true');
    this.indexEntriesOnly && this.addParams('debug', 'entries');
    query.sortFields && this.addParams('sort', query.sortFields);
    query.sortHints && query.sortHints.forEach((hint: string) => this.addParams(hint, null));
    QueryOperators.isAnd(query.defaultOperator) && this.addParams('operator', query.defaultOperator);
    query.waitForNonStaleResultsTimeout && this.addParams('waitForNonStaleResultsTimeout', query.waitForNonStaleResultsTimeout);

    if ((this.endPoint + '?' + QueryString.stringify(this.params)).length > this.conventions.maxLengthOfQueryUsingGetUrl) {
      this.method = RequestMethods.Post;
    }
  }

  public setResponse(response: IResponse): IRavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body;

    if (!responseBody) {
      throw new ErrorResponseException(StringUtil.format('Could not find index {0}', this.indexName));
    }

    if (responseBody.Error) {
      throw new ErrorResponseException(responseBody.Error);
    }

    return responseBody as IRavenCommandResponse;
  }
}