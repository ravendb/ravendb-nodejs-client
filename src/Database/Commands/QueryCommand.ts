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
import {log} from "util";

export class QueryCommand extends RavenCommand {
  protected indexName: string;
  protected indexQuery: IndexQuery;
  protected conventions: DocumentConventions;
  protected includes?: string[];
  protected metadataOnly: boolean = false;
  protected indexEntriesOnly: boolean = false;

  constructor(indexName: string, indexQuery: IndexQuery, conventions: DocumentConventions,
    includes?: string[], metadataOnly: boolean = false, indexEntriesOnly: boolean = false
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
    this.includes = includes;
    this.metadataOnly = metadataOnly;
    this.indexEntriesOnly = indexEntriesOnly;
  }

  public createRequest(serverNode: ServerNode): void {
    const query = this.indexQuery;

    this.params = {
      WaitForNonStaleResultsAsOfNow: true,
      PageSize: query.pageSize,
      Start: query.start,
      Query: query.query
    };

    this.payload = {
      WaitForNonStaleResultsAsOfNow: true,
      PageSize: query.pageSize,
      Start: query.start,
      Query: query.query
    };


    // remove indexName
    this.endPoint = StringUtil.format(
      '{0}/databases/{1}/queries?',
      serverNode.url,serverNode.database
    );

    query.query && this.addParams('Query', query.query);
    query.fetch && this.addParams('fetch', query.fetch);
    this.includes && this.addParams('include', this.includes);
    this.metadataOnly && this.addParams('metadata-only', 'true');
    this.indexEntriesOnly && this.addParams('debug', 'entries');
    query.sortFields && this.addParams('sort', query.sortFields);
    query.sortHints && query.sortHints.forEach((hint: string) => this.addParams(hint, null));
    QueryOperators.isAnd(query.defaultOperator) && this.addParams('operator', query.defaultOperator);

    if (query.waitForNonStaleResults) {
      this.addParams({
        WaitForNonStaleResultsAsOfNow: 'true',
        WaitForNonStaleResultsTimeout: query.waitForNonStaleResultsTimeout
      });
    }
    
    if ((this.endPoint + '?' + QueryString.stringify(this.params)).length > this.conventions.maxLengthOfQueryUsingGetUrl) {
      this.method = RequestMethods.Post;
    }

  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    if (!response.body) {
      throw new IndexDoesNotExistException(StringUtil.format('Could not find index {0}', this.indexName));
    }
      return result;
  }
}