import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {DocumentKey} from "../../Documents/IDocument";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {TypeUtil} from "../../Utility/TypeUtil";

export class DeleteDatabaseCommand extends RavenCommand {
    protected name?: DocumentKey;
    protected hardDelete?: boolean;

    constructor(name: DocumentKey, hardDelete?: boolean) {
        super('', RequestMethods.Delete);

        this.name = name;
        this.hardDelete = hardDelete;
    }

    public createRequest(serverNode: ServerNode): void {
        let dbName = this.name.replace('Rave/Databases/', '');

        this.params = {id: this.name};
        this.endPoint = StringUtil.format('{url}/admin/databases?name={database}', StringUtil.format(dbName));

        if(this.hardDelete) {
            this.endPoint += "'&'+hardDelete+'=true'";
        }
    }

    public setResponse(response: IResponse): IRavenCommandResponse | null | void {

        const body: IResponseBody = response.body;

        if (StatusCodes.isOk(response.statusCode)) {
            return body as IRavenCommandResponse;
        }

        if(!response[0]['Deleted']) {
            throw new ErrorResponseException(response[0]['Error']);
        }
        return null;
    }
}
