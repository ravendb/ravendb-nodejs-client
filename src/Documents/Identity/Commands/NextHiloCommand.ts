import { ServerNode } from "../../../Http/ServerNode.js";
import { DateUtil } from "../../../Utility/DateUtil.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { throwError } from "../../../Exceptions/index.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";

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
            ? DateUtil.utc.stringify(this._lastRangeAt)
            : "";

        let uri = `${node.url}/databases/${node.database}/hilo/next?`;
        uri += "lastBatchSize=" + this._lastBatchSize;
        if (this._tag) {
            uri += "&tag=" + this._urlEncode(this._tag);
        }

        uri += "&lastRangeAt=" + this._urlEncode(lastRangeAt);
        if (this._identityPartsSeparator) {
            uri += "&identityPartsSeparator=" + this._identityPartsSeparator;
        }
        if (this._lastRangeMax != null) {
            uri += "&lastMax=" + this._lastRangeMax;
        }
        return { uri };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
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
