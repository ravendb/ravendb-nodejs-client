import { ServerNode } from "../../Http/ServerNode";
import { RequestMethods } from "../../Http/Request/RequestMethod";
import { StringUtil } from "../../Utility/StringUtil";
import { DateUtil } from "../../Utility/DateUtil";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import * as qs from "qs";
import { HttpRequestBase } from "../../Primitives/Http";

export interface HiLoResult {
    prefix: string;
    low: number;
    high: number;
    lastSize: number;
    serverTag: string;
    lastRangeAt: Date;
}
export class NextHiloCommand extends RavenCommand<HiLoResult> {

    private _tag: string;
    private _lastBatchSize: number;
    private _lastRangeAt: Date;
    private _identityPartsSeparator: string;
    private _lastRangeMax: number;

    public constructor(
        tag: string,
        lastBatchSize: number,
        lastRangeAt: Date,
        identityPartsSeparator: string,
        lastRangeMax: number) {
        super();

        if (!tag) {
            throwError("InvalidArgumentException", "tag cannot be null");
        }

        if (!identityPartsSeparator) {
            throwError("InvalidArgumentException", "identityPartsSeparator cannot be null");
        }

        this._tag = tag;
        this._lastBatchSize = lastBatchSize;
        this._lastRangeAt = lastRangeAt;
        this._identityPartsSeparator = identityPartsSeparator;
        this._lastRangeMax = lastRangeMax;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const lastRangeAt: string = this._lastRangeAt
            ? DateUtil.stringify(this._lastRangeAt)
            : "";

        const queryString = qs.stringify({
            tag: this._tag,
            lastBatchSize: this._lastBatchSize,
            lastRangeAt,
            identityPartsSeparator: this._identityPartsSeparator,
            lastMax: this._lastRangeMax
        });

        const uri = `${node.url}/databases/${node.database}/hilo/next?${queryString}`;
        return { uri };
    }

    public setResponse(response: string, fromCache: boolean) {
        const res = this.mapper.deserialize<HiLoResult>(response, {
            nestedTypes: [ 
                ["lastRangeAt", "date"]
            ]
        });
        
        this.result = res;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
