import { IOperation, OperationResultType } from "../OperationAbstractions.js";
import { TimeSeriesRangeResult } from "./TimeSeriesRangeResult.js";
import { TypeUtil } from "../../../Utility/TypeUtil.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { throwError } from "../../../Exceptions/index.js";
import { IDocumentStore } from "../../IDocumentStore.js";
import { HttpCache } from "../../../Http/HttpCache.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { DateUtil } from "../../../Utility/DateUtil.js";
import { Stream } from "node:stream";
import { TimeSeriesEntry } from "../../Session/TimeSeries/TimeSeriesEntry.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { StringBuilder } from "../../../Utility/StringBuilder.js";
import { ServerResponse } from "../../../Types/index.js";
import { ITimeSeriesIncludeBuilder } from "../../Session/Loaders/ITimeSeriesIncludeBuilder.js";
import { TimeSeriesIncludeBuilder } from "../../Session/Loaders/TimeSeriesIncludeBuilder.js";

export class GetTimeSeriesOperation implements IOperation<TimeSeriesRangeResult> {
    private readonly _docId: string;
    private readonly _name: string;
    private readonly _start: number;
    private readonly _pageSize: number;
    private readonly _from: Date;
    private readonly _to: Date;
    private readonly _includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void;
    private readonly _returnFullResults: boolean;

    public constructor(docId: string, timeseries: string);
    public constructor(docId: string, timeseries: string, from: Date, to: Date);
    public constructor(docId: string, timeseries: string, from: Date, to: Date, start: number);
    public constructor(docId: string, timeseries: string, from: Date, to: Date, start: number, pageSize: number);
    public constructor(docId: string, timeseries: string, from: Date, to: Date, start: number, pageSize: number, includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void);
    public constructor(docId: string, timeseries: string, from: Date, to: Date, start: number, pageSize: number, includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void, returnFullResults: boolean);
    public constructor(docId: string, timeseries: string, from?: Date, to?: Date, start: number = 0, pageSize: number = TypeUtil.MAX_INT32,
                       includes?: (includeBuilder: ITimeSeriesIncludeBuilder) => void, returnFullResults: boolean = false) {
        if (StringUtil.isNullOrEmpty(docId)) {
            throwError("InvalidArgumentException", "DocId cannot be null or empty");
        }

        if (StringUtil.isNullOrEmpty(timeseries)) {
            throwError("InvalidArgumentException", "Timeseries cannot be null or empty");
        }

        this._docId = docId;
        this._start = start;
        this._pageSize = pageSize;
        this._name = timeseries;
        this._from = from;
        this._to = to;
        this._includes = includes;
        this._returnFullResults = returnFullResults;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<TimeSeriesRangeResult> {
        return new GetTimeSeriesCommand(conventions, this._docId, this._name, this._from, this._to, this._start, this._pageSize, this._includes, this._returnFullResults);
    }
}

export class GetTimeSeriesCommand extends RavenCommand<TimeSeriesRangeResult> {
    private readonly _conventions: DocumentConventions;
    private readonly _docId: string;
    private readonly _name: string;
    private readonly _start: number;
    private readonly _pageSize: number;
    private readonly _from: Date;
    private readonly _to: Date;
    private readonly _includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void;
    private readonly _returnFullResults: boolean;

    public constructor(conventions: DocumentConventions, docId: string, name: string, from: Date, to: Date, start: number, pageSize: number,
                       includes?: (includeBuilder: ITimeSeriesIncludeBuilder) => void, returnFullResults: boolean = false) {
        super();

        this._conventions = conventions;
        this._docId = docId;
        this._name = name;
        this._start = start;
        this._pageSize = pageSize;
        this._from = from;
        this._to = to;
        this._includes = includes;
        this._returnFullResults = returnFullResults;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const pathBuilder = new StringBuilder(node.url);

        pathBuilder
            .append("/databases/")
            .append(node.database)
            .append("/timeseries")
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

        pathBuilder
            .append("&name=")
            .append(this._urlEncode(this._name));

        if (this._from) {
            pathBuilder
                .append("&from=")
                .append(encodeURIComponent(DateUtil.utc.stringify(this._from)));
        }

        if (this._to) {
            pathBuilder
                .append("&to=")
                .append(encodeURIComponent(DateUtil.utc.stringify(this._to)));
        }

        if (this._includes) {
            GetTimeSeriesCommand.addIncludesToRequest(pathBuilder, this._includes);
        }

        if (this._returnFullResults) {
            pathBuilder
                .append("&full=true");
        }

        const uri = pathBuilder.toString();

        return {
            method: "GET",
            uri
        }
    }

    public static addIncludesToRequest(pathBuilder: StringBuilder, includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void): void {
        const includeBuilder = new TimeSeriesIncludeBuilder(DocumentConventions.defaultConventions);

        includes(includeBuilder);

        if (includeBuilder.includeTimeSeriesDocument) {
            pathBuilder
                .append("&includeDocument=true");
        }

        if (includeBuilder.includeTimeSeriesTags) {
            pathBuilder
                .append("&includeTags=true");
        }
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;

        const results = await this._pipeline<any>()
            .parseJsonSync()
            .collectBody(b => body = b)
            .process(bodyStream);

        const transformedResults = GetTimeSeriesCommand.mapToLocalObject(results);

        this.result = reviveTimeSeriesRangeResult(transformedResults);

        return body;
    }

    get isReadRequest(): boolean {
        return true;
    }

    static mapToLocalObject(json: any): ServerResponse<TimeSeriesRangeResult> {
        const result: ServerResponse<TimeSeriesRangeResult> = {
            to: json.To,
            from: json.From,
            includes: json.Includes,
            totalResults: json.TotalResults,
            entries: json.Entries.map(entry => ({
                timestamp: entry.Timestamp,
                tag: entry.Tag,
                values: entry.Values,
                isRollup: entry.IsRollup,
                nodeValues: entry.NodeValues
            }))
        };

        return result;
    }
}

export function reviveTimeSeriesEntry(raw: any): TimeSeriesEntry {
    const result = new TimeSeriesEntry();
    result.timestamp = DateUtil.utc.parse(raw.Timestamp);
    result.isRollup = raw.IsRollup;
    result.tag = raw.Tag;
    result.values = raw.Values;
    result.nodeValues = raw.NodeValues;
    return result;
}

export function reviveTimeSeriesRangeResult(json: ServerResponse<TimeSeriesRangeResult>): TimeSeriesRangeResult {
    const result = new TimeSeriesRangeResult();

    const { to, from, entries, ...restProps } = json;

    const entryMapper = (rawEntry: ServerResponse<TimeSeriesEntry>) => {
        const result = new TimeSeriesEntry();
        result.timestamp = DateUtil.utc.parse(rawEntry.timestamp);
        result.isRollup = rawEntry.isRollup;
        result.tag = rawEntry.tag;
        result.values = rawEntry.values;
        result.nodeValues = rawEntry.nodeValues;

        return result;
    };

    const overrides: Partial<TimeSeriesRangeResult> = {
        ...restProps,
        to: DateUtil.utc.parse(to),
        from: DateUtil.utc.parse(from),
        entries: entries.map(entryMapper),
    }

    return Object.assign(result, overrides);
}
