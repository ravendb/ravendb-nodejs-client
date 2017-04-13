import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StringUtil} from "../../Utility/StringUtil";

export class GetIndexCommand extends RavenCommand {
    protected indexName?: string;
    protected forceReadFromMaster?: boolean;

    constructor(indexName: string, forceReadFromMaster: boolean) {
        super('', RequestMethods.Get);
        this.indexName = indexName;
        this.forceReadFromMaster = forceReadFromMaster;
    }

    public createRequest(serverNode: ServerNode): void {
        this.endPoint = StringUtil.format('{url}/databases/{database}/indexes?{database}'/*not sure*/, serverNode, StringUtil.format('name'= this.indexName?"{indexName}":""));

    }

    public setResponse(response: IResponse): IRavenCommandResponse | null | void {
        const responseBody: IResponseBody = response.body;

        if (!responseBody) {
            return null
        }

        return responseBody.toJson() as IRavenCommandResponse;
    }
}