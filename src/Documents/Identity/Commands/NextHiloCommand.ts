import * as qs from "qs";
import { ServerNode } from "../../../Http/ServerNode";
import { DateUtil } from "../../../Utility/DateUtil";
import { RavenCommand} from "../../../Http/RavenCommand";
import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";

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
            throwError("InvalidArgumentException", "tag cannot be null.");
        }

        if (!identityPartsSeparator) {
            throwError("InvalidArgumentException", "identityPartsSeparator cannot be null.");
        }

        this._tag = tag;
        this._lastBatchSize = lastBatchSize;
        this._lastRangeAt = lastRangeAt;
        this._identityPartsSeparator = identityPartsSeparator;
        this._lastRangeMax = lastRangeMax;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
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

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._getDefaultResponsePipeline()
            .process(bodyStream)
            .then(results => {
                this.result = this._reviveResultTypes(results.result, {
                    nestedTypes: {
                        lastRangeAt: "date"
                    }
                });
                
                return results.body;
            });
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
