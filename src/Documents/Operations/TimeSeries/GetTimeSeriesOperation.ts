import { IOperation, OperationResultType } from "../OperationAbstractions";
import { TimeSeriesRangeResult } from "./TimeSeriesRangeResult";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { IDocumentStore } from "../../IDocumentStore";
import { HttpCache } from "../../../Http/HttpCache";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { DateUtil } from "../../../Utility/DateUtil";
import * as stream from "readable-stream";
import { TimeSeriesEntry } from "../../Session/TimeSeries/TimeSeriesEntry";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { StringBuilder } from "../../../Utility/StringBuilder";
import { ServerResponse } from "../../../Types";
import { ITimeSeriesIncludeBuilder } from "../../Session/Loaders/ITimeSeriesIncludeBuilder";
import { TimeSeriesIncludeBuilder } from "../../Session/Loaders/TimeSeriesIncludeBuilder";
import { ObjectUtil } from "../../../Utility/ObjectUtil";

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

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;

        const results = await this._pipeline<any>()
            .parseJsonSync()
            .collectBody(b => body = b)
            .process(bodyStream);

        const transformedResults = GetTimeSeriesCommand.mapToLocalObject(results, this._conventions);

        this.result = reviveTimeSeriesRangeResult(transformedResults, this._conventions);

        return body;
    }

    get isReadRequest(): boolean {
        return true;
    }

    static mapToLocalObject(json: any, conventions: DocumentConventions): ServerResponse<TimeSeriesRangeResult> {
        const result: ServerResponse<TimeSeriesRangeResult> = {
            to: json.To,
            from: json.From,
            includes: json.Includes,
            totalResults: json.TotalResults,
            entries: json.Entries.map(entry => ({
                timestamp: entry.Timestamp,
                tag: entry.Tag,
                values: entry.Values,
                isRollup: entry.IsRollup
            }))
        };

        return result;
    }
}

export function reviveTimeSeriesRangeResult(json: ServerResponse<TimeSeriesRangeResult>, conventions: DocumentConventions): TimeSeriesRangeResult {
    const result = new TimeSeriesRangeResult();

    const { to, from, entries, ...restProps } = json;

    const entryMapper = (rawEntry: ServerResponse<TimeSeriesEntry>) => {
        const result = new TimeSeriesEntry();
        result.timestamp = conventions.dateUtil.parse(rawEntry.timestamp);
        result.isRollup = rawEntry.isRollup;
        result.tag = rawEntry.tag;
        result.values = rawEntry.values;

        return result;
    };

    const overrides: Partial<TimeSeriesRangeResult> = {
        ...restProps,
        to: conventions.dateUtil.parse(to),
        from: conventions.dateUtil.parse(from),
        entries: entries.map(entryMapper),
    }

    return Object.assign(result, overrides);
}
