import {HttpRequestBase} from '../../Primitives/Http';
import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { ServerNode } from '../../Http/ServerNode';
import { HeadersBuilder } from '../../Utility/HttpUtil';

export class DeleteDocumentCommand extends RavenCommand<void> {
    private _id: string;
    private _changeVector: string;

    public constructor(id: string);
    public constructor(id: string, changeVector: string);
    public constructor(id: string, changeVector: string = null) {
        super();

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null.");
        }

        this._id = id;
        this._changeVector = changeVector;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        RavenCommand.ensureIsNotNullOrEmpty(this._id, "id");

        const uri = node.url + "/databases/" + node.database + "/docs?id=" + encodeURIComponent(this._id);

        const request = { 
            method: "DELETE",
            uri, 
            headers: this._getHeaders().build() 
        };
        this._addChangeVectorIfNotNull(this._changeVector, request);
        
        return request;
    }
    
    public get isReadRequest() {
        return false;
    }
}
