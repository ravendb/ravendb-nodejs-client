import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException, ErrorResponseException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {DatabaseDocument} from "../../Documents/DatabaseDocument";

export class CreateDatabaseCommand extends RavenCommand {
    protected databaseDocument?: DatabaseDocument;
    protected data? : any;

    constructor(databaseDocument: DatabaseDocument) {
        super('', RequestMethods.Put);

        this.databaseDocument = databaseDocument;
    }

    public createRequest(serverNode: ServerNode): void {
        if(this.databaseDocument.settings != 'Raven/DataDir') {
            throw new InvalidOperationException("The Raven/DataDir setting is mandatory");
        }

        let dbName = this.databaseDocument.databaseId.replace('Raven/Databases/', '');

        this.params = {name:dbName};
        this.endPoint = StringUtil.format('{url}/admin/databases', serverNode, this.params);
        this.payload = this.databaseDocument.toJson();
    }

    public setResponse(response: IResponse): IRavenCommandResponse | null | void {
        const body: IResponseBody = response.body;

        if (!response) {
            throw new ErrorResponseException('Response is invalid.')
        }

        if (StatusCodes.isOk(response.statusCode)) {
            return body as IRavenCommandResponse;
        }

        if (StatusCodes.isBadRequest(response.statusCode)) {
            throw new ErrorResponseException(body.Message);
        }

    }
}
