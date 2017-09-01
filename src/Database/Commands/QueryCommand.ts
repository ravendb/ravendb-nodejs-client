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
  protected indexQuery: IndexQuery;
  protected conventions: DocumentConventions;
  protected metadataOnly: boolean = false;
  protected indexEntriesOnly: boolean = false;

  //new removed indexName
  constructor(indexQuery: IndexQuery, conventions: DocumentConventions,
    metadataOnly: boolean = false, indexEntriesOnly: boolean = false
  ) {
    super('', RequestMethods.Post);

    if (!(indexQuery instanceof IndexQuery)) {
      throw new InvalidOperationException('Query must be an instance of IndexQuery class');
    }

    if (!conventions) {
      throw new InvalidOperationException('Document conventions cannot be empty');
    }

    this.indexQuery = indexQuery;
    this.conventions = conventions;
    this.metadataOnly = metadataOnly;
    this.indexEntriesOnly = indexEntriesOnly;
  }

  public createRequest(serverNode: ServerNode): void {
    const query = this.indexQuery;
    
    this.payload = query.toJson();
    this.params = {"query-hash": query.queryHash};
    this.metadataOnly && this.addParams('metadata-only', 'true');
    this.indexEntriesOnly && this.addParams('debug', 'entries');
    this.endPoint = StringUtil.format('{url}/databases/{database}/queries', serverNode);    
  }
}