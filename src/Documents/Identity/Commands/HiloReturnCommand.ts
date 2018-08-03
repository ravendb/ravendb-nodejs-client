import { ServerNode } from "../../../Http/ServerNode";
import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { RavenCommand } from "../../../Http/RavenCommand";

export class HiloReturnCommand extends RavenCommand<void> {

    public get isReadRequest() {
        return false;
    }

    private _tag: string;
    private _last: number;
    private _end: number;

    public constructor(tag: string, last: number, end: number) {
        super();

        if (last < 0) {
            throwError("InvalidArgumentException", "last is < 0");
        }

        if (end < 0) {
            throwError("InvalidArgumentException", "end is < 0");
        }

        if (!tag) {
            throwError("InvalidArgumentException", "tag cannot be null");
        }

        this._tag = tag;
        this._last = last;
        this._end = end;
        this._responseType = "Empty";
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/hilo/return?`
            + `tag=${this._tag}&end=${this._end}&last=${this._last}`;
        return {
            method: "PUT",
            uri
        };
    }
}
