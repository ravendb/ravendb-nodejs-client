import { IOperation, OperationResultType } from "../OperationAbstractions";
import { TimeSeriesDetails } from "./TimeSeriesDetails";
import { TimeSeriesRange } from "./TimeSeriesRange";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { throwError } from "../../../Exceptions";
import { StringUtil } from "../../../Utility/StringUtil";
import { IDocumentStore } from "../../IDocumentStore";
import { HttpCache } from "../../../Http/HttpCache";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { DateUtil } from "../../../Utility/DateUtil";
import * as stream from "readable-stream";
import { CaseInsensitiveKeysMap } from "../../../Primitives/CaseInsensitiveKeysMap";
import { GetTimeSeriesCommand, reviveTimeSeriesRangeResult } from "./GetTimeSeriesOperation";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { StringBuilder } from "../../../Utility/StringBuilder";
import { ITimeSeriesIncludeBuilder } from "../../Session/Loaders/ITimeSeriesIncludeBuilder";

export class GetMultipleTimeSeriesOperation implements IOperation<TimeSeriesDetails> {
    private readonly _docId: string;
    private _ranges: TimeSeriesRange[];
    private readonly _start: number;
    private readonly _pageSize: number;
    private readonly _includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void;

    public constructor(docId: string, ranges: TimeSeriesRange[])
    public constructor(docId: string, ranges: TimeSeriesRange[], start: number, pageSize: number)
    public constructor(docId: string, ranges: TimeSeriesRange[], start: number, pageSize: number, includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void)
    public constructor(docId: string, ranges: TimeSeriesRange[], start?: number, pageSize?: number, includes?: (includeBuilder: ITimeSeriesIncludeBuilder) => void) {
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
        this._includes = includes;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<TimeSeriesDetails> {
        return new GetMultipleTimeSeriesCommand(conventions, this._docId, this._ranges, this._start, this._pageSize, this._includes);
    }
}

export class GetMultipleTimeSeriesCommand extends RavenCommand<TimeSeriesDetails> {
    private readonly _conventions: DocumentConventions;
    private readonly _docId: string;
    private readonly _ranges: TimeSeriesRange[];
    private readonly _start: number;
    private readonly _pageSize: number;
    private readonly _includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void;

    constructor(
        conventions: DocumentConventions,
        docId: string,
        ranges: TimeSeriesRange[],
        start: number,
        pageSize: number,
        includes?: (includeBuilder: ITimeSeriesIncludeBuilder) => void) {
        super();

        if (!docId) {
            throwError("InvalidArgumentException", "DocId cannot be null");
        }

        this._conventions = conventions;
        this._docId = docId;
        this._ranges = ranges;
        this._start = start;
        this._pageSize = pageSize;
        this._includes = includes;
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

        if (this._includes) {
            GetTimeSeriesCommand.addIncludesToRequest(pathBuilder, this._includes);
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
        const results = await this._pipeline<any>()
            .parseJsonSync()
            .collectBody(b => body = b)
            .process(bodyStream);

        this.result = new TimeSeriesDetails();
        this.result.id = results.Id;
        this.result.values = CaseInsensitiveKeysMap.create();

        for (const [key, value] of Object.entries(results.Values)) {
            const mapped = (value as any).map(x => reviveTimeSeriesRangeResult(GetTimeSeriesCommand.mapToLocalObject(x, this._conventions), this._conventions));
            this.result.values.set(key, mapped);
        }

        return body;
    }

    get isReadRequest(): boolean {
        return true;
    }
}
