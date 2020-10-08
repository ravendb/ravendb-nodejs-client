import { IOperation, OperationResultType } from "../OperationAbstractions";
import { TimeSeriesRangeResult } from "./TimeSeriesRangeResult";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { IDocumentStore } from "../../IDocumentStore";
import { DocumentConventions, RavenCommand, ServerNode } from "../../..";
import { HttpCache } from "../../../Http/HttpCache";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as StringBuilder from "string-builder";
import { DateUtil } from "../../../Utility/DateUtil";
import * as stream from "readable-stream";

export class GetTimeSeriesOperation implements IOperation<TimeSeriesRangeResult> {
    private readonly _docId: string;
    private readonly _name: string;
    private readonly _start: number;
    private readonly _pageSize: number;
    private readonly _from: Date;
    private readonly _to: Date;

    public constructor(docId: string, timeseries: string);
    public constructor(docId: string, timeseries: string, from: Date, to: Date);
    public constructor(docId: string, timeseries: string, from: Date, to: Date, start: number);
    public constructor(docId: string, timeseries: string, from: Date, to: Date, start: number, pageSize: number);
    public constructor(docId: string, timeseries: string, from?: Date, to?: Date, start: number = 0, pageSize: number = TypeUtil.MAX_INT32) {
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
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<TimeSeriesRangeResult> {
        return new GetTimeSeriesCommand(this._docId, this._name, this._from, this._to, this._start, this._pageSize);
    }
}

class GetTimeSeriesCommand extends RavenCommand<TimeSeriesRangeResult> {
    private readonly _docId: string;
    private readonly _name: string;
    private readonly _start: number;
    private readonly _pageSize: number;
    private readonly _from: Date;
    private readonly _to: Date;

    public constructor(docId: string, name: string, from: Date, to: Date, start: number, pageSize: number) {
        super();

        this._docId = docId;
        this._name = name;
        this._start = start;
        this._pageSize = pageSize;
        this._from = from;
        this._to = to;
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
                .append(this._start);
        }

        if (this._pageSize < TypeUtil.MAX_INT32) {
            pathBuilder
                .append("&pageSize=")
                .append(this._pageSize);
        }

        pathBuilder
            .append("&name=")
            .append(this._urlEncode(this._name));

        if (this._from) {
            pathBuilder
                .append("&from=")
                .append(DateUtil.utc.stringify(this._from));
        }

        if (this._to) {
            pathBuilder
                .append("&to=")
                .append(DateUtil.utc.stringify(this._to));
        }

        const uri = pathBuilder.toString();

        return {
            method: "GET",
            uri
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    get isReadRequest(): boolean {
        return true;
    }
}