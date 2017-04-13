import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {QueryString} from "../../Http/QueryString";

export class DeleteIndexCommand extends RavenCommand {
    protected indexName?: string;

    constructor(indexName: string) {
        super('', RequestMethods.Delete);
        this.indexName = indexName;
    }

    public createRequest(serverNode: ServerNode): void {
        if(!this.indexName) {
            throw new ErrorResponseException('Null or empty indexName is invalid')
        }
        this.params={name: QueryString.encode(this.indexName, true)};
        this.endPoint = StringUtil.format('{url}/databases/{database}/indexes', serverNode, this.params);
    }
}
