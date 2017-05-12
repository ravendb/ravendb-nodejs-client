import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException, ErrorResponseException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {DatabaseDocument} from "../DatabaseDocument";

export class CreateDatabaseCommand extends RavenCommand {
    protected databaseDocument: DatabaseDocument;

    constructor(databaseDocument: DatabaseDocument) {
        super('', RequestMethods.Put);
        this.databaseDocument = databaseDocument;
    }

    public createRequest(serverNode: ServerNode): void {
        const dbName: string = this.databaseDocument.databaseId.replace('Raven/Databases/', '');

        StringUtil.validateDBName(dbName);

        if (!('Raven/DataDir' in this.databaseDocument.settings)) {
            throw new InvalidOperationException("The Raven/DataDir setting is mandatory");
        }

        this.params = {name: dbName};
        this.endPoint = StringUtil.format('{url}/admin/databases', serverNode);
        this.payload = this.databaseDocument.toJson();
    }

    public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
        const body: IResponseBody = response.body;

        if (!body) {
            throw new ErrorResponseException('Response is invalid.')
        }

        if (StatusCodes.isOk(response.statusCode)) {
            return body;
        }

        if (StatusCodes.isBadRequest(response.statusCode)) {
            throw new ErrorResponseException(body.Message);
        }
    }
}
