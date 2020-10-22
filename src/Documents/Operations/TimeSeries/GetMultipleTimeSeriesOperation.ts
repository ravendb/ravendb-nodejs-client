import { IOperation, OperationResultType } from "../OperationAbstractions";
import { TimeSeriesDetails } from "./TimeSeriesDetails";
import { TimeSeriesRange } from "./TimeSeriesRange";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { throwError } from "../../../Exceptions";
import { StringUtil } from "../../../Utility/StringUtil";
import { IDocumentStore } from "../../IDocumentStore";
import { DocumentConventions, RavenCommand, ServerNode } from "../../..";
import { HttpCache } from "../../../Http/HttpCache";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as StringBuilder from "string-builder";
import { DateUtil } from "../../../Utility/DateUtil";
import * as stream from "readable-stream";
import { CaseInsensitiveKeysMap } from "../../../Primitives/CaseInsensitiveKeysMap";
import { reviveTimeSeriesRangeResult } from "./GetTimeSeriesOperation";

export class GetMultipleTimeSeriesOperation implements IOperation<TimeSeriesDetails> {
    private readonly _docId: string;
    private _ranges: TimeSeriesRange[];
    private readonly _start: number;
    private readonly _pageSize: number;

    public constructor(docId: string, ranges: TimeSeriesRange[])
    public constructor(docId: string, ranges: TimeSeriesRange[], start: number, pageSize: number)
    public constructor(docId: string, ranges: TimeSeriesRange[], start?: number, pageSize?: number) {
        if (!ranges) {
            throwError("InvalidArgumentException", "Ranges cannot be null");
        }
        if (StringUtil.isNullOrEmpty(docId)) {
            throwError("InvalidArgumentException", "DocId cannot be null or empty")
        }
        this._docId = docId;
        this._start = start ?? 0;
        this._pageSize = pageSize ?? TypeUtil.MAX_INT32;
        this._ranges = ranges;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<TimeSeriesDetails> {
        return new GetMultipleTimeSeriesCommand(conventions, this._docId, this._ranges, this._start, this._pageSize);
    }
}

export class GetMultipleTimeSeriesCommand extends RavenCommand<TimeSeriesDetails> {
    private readonly _conventions: DocumentConventions;
    private readonly _docId: string;
    private readonly _ranges: TimeSeriesRange[];
    private readonly _start: number;
    private readonly _pageSize: number;

    constructor(conventions: DocumentConventions, docId: string, ranges: TimeSeriesRange[], start: number, pageSize: number) {
        super();

        if (!docId) {
            throwError("InvalidArgumentException", "DocId cannot be null");
        }

        this._conventions = conventions;
        this._docId = docId;
        this._ranges = ranges;
        this._start = start;
        this._pageSize = pageSize;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const pathBuilder = new StringBuilder(node.url);

        pathBuilder
            .append("/databases/")
            .append(node.database)
            .append("/timeseries/ranges")
            .append("?docId=")
            .append(this._urlEncode(this._docId));

        if (this._start > 0) {
            pathBuilder
                .append("&start=")
                .append(this._start.toString());
        }

        if (this._pageSize < TypeUtil.MAX_INT32) {
            pathBuilder
                .append("&pageSize=")
                .append(this._pageSize.toString());
        }

        if (!this._ranges.length) {
            throwError("InvalidArgumentException", "Ranges cannot be null or empty");
        }

        for (const range of this._ranges) {
            if (StringUtil.isNullOrEmpty(range.name)) {
                throwError("InvalidArgumentException", "Missing name argument in TimeSeriesRange. Name cannot be null or empty");
            }

            pathBuilder
                .append("&name=")
                .append(range.name || "")
                .append("&from=")
                .append(range.from ? DateUtil.utc.stringify(range.from) : "")
                .append("&to=")
                .append(range.to ? DateUtil.utc.stringify(range.to) : "")
        }

        const uri = pathBuilder.toString();

        return {
            uri,
            method: "GET"
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        const results = await this._defaultPipeline(_ => body = _)
            .process(bodyStream);

        this.result = new TimeSeriesDetails();
        this.result.id = results.id;
        this.result.values = CaseInsensitiveKeysMap.create();

        for (const [key, value] of Object.entries(results.values)) {
            this.result.values.set(key, value.map(x => reviveTimeSeriesRangeResult(x, this._conventions)));
        }

        return body;
    }

    get isReadRequest(): boolean {
        return true;
    }
}
