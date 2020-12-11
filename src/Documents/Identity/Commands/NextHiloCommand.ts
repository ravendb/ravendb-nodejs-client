import * as qs from "qs";
import { ServerNode } from "../../../Http/ServerNode";
import { DateUtil } from "../../../Utility/DateUtil";
import { RavenCommand } from "../../../Http/RavenCommand";
import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions";

export interface HiLoResult {
    prefix: string;
    low: number;
    high: number;
    lastSize: number;
    serverTag: string;
    lastRangeAt: Date;
}

export class NextHiloCommand extends RavenCommand<HiLoResult> {

    private readonly _tag: string;
    private readonly _lastBatchSize: number;
    private readonly _lastRangeAt: Date;
    private readonly _identityPartsSeparator: string;
    private readonly _lastRangeMax: number;
    private readonly _conventions: DocumentConventions;

    public constructor(
        tag: string,
        lastBatchSize: number,
        lastRangeAt: Date,
        identityPartsSeparator: string,
        lastRangeMax: number,
        conventions: DocumentConventions) {
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
        this._conventions = conventions;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const lastRangeAt: string = this._lastRangeAt
            ? DateUtil.default.stringify(this._lastRangeAt)
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
        let body: string = null;
        const results = await this._defaultPipeline(_ => body = _).process(bodyStream);
        this.result = this._reviveResultTypes(
            results,
            this._conventions,
            {
                nestedTypes: {
                    lastRangeAt: "date"
                }
            });
        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
