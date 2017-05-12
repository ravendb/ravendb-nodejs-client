import * as _ from 'lodash';
import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {DatabaseDoesNotExistException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";

export class DeleteDatabaseCommand extends RavenCommand {
    protected databaseId?: string;
    protected hardDelete: boolean = false;

    constructor(databaseId: string, hardDelete: boolean = false) {
        super('', RequestMethods.Delete);

        this.databaseId = databaseId;
        this.hardDelete = hardDelete;
    }

    public createRequest(serverNode: ServerNode): void {
        let dbName: string = this.databaseId.replace('Raven/Databases/', '');

        this.params = {name: dbName};
        this.hardDelete && this.addParams({'hard-delete': 'true'});
        this.endPoint = StringUtil.format('{url}/admin/databases', serverNode);
    }

    public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
        const body: IResponseBody = response.body;

        if (body.Error) {
            throw new DatabaseDoesNotExistException(body.Message);
        }
    }
}
