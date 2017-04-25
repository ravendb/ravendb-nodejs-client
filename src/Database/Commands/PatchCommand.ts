import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RavenCommandResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {IndexDefinition} from "../Indexes/IndexDefinition";
import {DocumentKey} from "../../Documents/IDocument";
import {QueryString} from "../../Http/QueryString";

export class PatchCommand extends RavenCommand {
    protected key?: DocumentKey;
    protected patch: {};
    protected etag: number;
    protected patchIfMissing: any;
    protected skipPatchIfEtagMismatch: boolean;
    protected returnDebugInformation: boolean;
    protected path: string;
    protected data: {};


    constructor(key: DocumentKey, patch, etag, patchIfMissing = true,skipPatchIfEtagMismatch = false, returnDebugInformation = false) {
        super('', RequestMethods.Patch);

        this.key = key;
        this.patch = patch;
        this.etag = etag;
        this.patchIfMissing = patchIfMissing;
        this.skipPatchIfEtagMismatch = skipPatchIfEtagMismatch;
        this.returnDebugInformation = returnDebugInformation;
    }

    public createRequest(serverNode: ServerNode): void {
        if (!this.key) {
            throw new InvalidOperationException('None key is invalid');
        }

        if (!this.patch) {
            throw new InvalidOperationException('None patch is invalid');
        }

        if (this.patchIfMissing && !this.patchIfMissing.script) {
            throw new InvalidOperationException('None or Empty script is invalid');
        }

        this.params = {docs: 'docs'};
        this.endPoint = StringUtil.format('{url}/databases/{database}/', serverNode, this.params);
        this.skipPatchIfEtagMismatch && this.addParams('skipPatchIfEtagMismatch', this.skipPatchIfEtagMismatch);
        this.returnDebugInformation && this.addParams('debug', this.returnDebugInformation);

        this.payload = {"Patch": this.patch.toJson()/*from where to use it*/, "PatchIfMissing": this.patchIfMissing ? this.patchIfMissing.toJson() : null};





        if (this.etag != null) {
            this.headers = StringUtil.format(this.etag, {"If-Match": ''+this.etag+''});   //  {"If-Match": "\"{etag}\"".format(self.etag)} //how to write
        }


    }

    public setResponse(response: IResponse): RavenCommandResponse | null | void {

        if (response && response.statusCode == 200) {
            return response.toJson() as RavenCommandResponse;
        }
    }
}