import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {IndexQuery} from "../Indexes/IndexQuery";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {StatusCode, StatusCodes} from "../../Http/Response/StatusCode";

export class DeleteByIndexCommand extends RavenCommand {
    protected indexName?: string;
    protected query?: IndexQuery;
    protected options?: QueryOperationOptions;

    constructor(indexName: string, query: IndexQuery, options = null) {
        super('', RequestMethods.Delete);
        this.indexName = indexName;
        this.query = query;
        this.options = options;
    }

    public createRequest(serverNode: ServerNode): void {
        this.params = {};
        this.endPoint = StringUtil.format('{url}/databases/{database}/indexes', serverNode,this.params);
        this.indexName && this.addParams('indexName',this.indexName);
        this.query && this.addParams('query', this.query);
        this.options && this.addParams('options', this.options);
    }

    public setResponse(response: IResponse): IRavenCommandResponse | null | void {
        const responseBody: IResponseBody = response.body;
        const status: StatusCode = response.statusCode;

        if(!responseBody) {
            throw new ErrorResponseException('Could not find index {indexName}')
        }

        if (responseBody && !StatusCodes.isOk(status) && !StatusCodes.isAccepted(status)) {
            throw new ErrorResponseException(responseBody.Error)
        }

        return responseBody as IRavenCommandResponse;
    }
}
