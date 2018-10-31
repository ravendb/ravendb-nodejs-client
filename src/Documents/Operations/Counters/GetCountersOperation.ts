import { IOperation, OperationResultType } from "../OperationAbstractions";
import { CountersDetail } from "../Counters/CountersDetail";
import { IDocumentStore } from "../../IDocumentStore";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpCache } from "../../../Http/HttpCache";
import { RavenCommand } from "../../../Http/RavenCommand";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as StringBuilder from "string-builder";
import { DocumentCountersOperation } from "./DocumentCountersOperation";
import { CounterOperation } from "./CounterOperation";
import { CounterBatch } from "./CounterBatch";
import * as stream from "readable-stream";

export class GetCountersOperation implements IOperation<CountersDetail> {
    private readonly _docId: string;
    private readonly _counters: string[];
    private readonly _returnFullResults: boolean;

    public constructor(docId: string);
    public constructor(docId: string, counters: string[]);
    public constructor(docId: string, counters: string[], returnFullResults: boolean);
    public constructor(docId: string, counter: string);
    public constructor(docId: string, counter: string, returnFullResults: boolean);
    public constructor(docId: string, counters?: string | string[], returnFullResults: boolean = false) {
        this._docId = docId;
        if (counters) {
            this._counters = Array.isArray(counters) ? counters : [counters];
        } else {
            this._counters = [];
        }

        this._returnFullResults = returnFullResults;
    }

    public getCommand(
        store: IDocumentStore, conventions: DocumentConventions, cache: HttpCache): RavenCommand<CountersDetail> {
        return new GetCounterValuesCommand(
            this._docId, this._counters, this._returnFullResults, conventions);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class GetCounterValuesCommand extends RavenCommand<CountersDetail> {
    private readonly _docId: string;
    private readonly _counters: string[];
    private readonly _returnFullResults: boolean;
    private readonly _conventions: DocumentConventions;

    public constructor(
        docId: string, counters: string[], returnFullResults: boolean, conventions: DocumentConventions) {
        super();

        if (!docId) {
            throwError("InvalidArgumentException", "DocId cannot be null");
        }

        this._docId = docId;
        this._counters = counters;
        this._returnFullResults = returnFullResults;
        this._conventions = conventions;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const pathBuilder = new StringBuilder(node.url);
        pathBuilder.append("/databases/")
            .append(node.database)
            .append("/counters?docId=")
            .append(encodeURIComponent(this._docId));

        if (this._returnFullResults) {
            pathBuilder.append("&full=true");
        }

        const req = { uri: null };
        if (this._counters.length > 0) {

            if (this._counters.length > 1) {
                this._prepareRequestWithMultipleCounters(pathBuilder, req);
            } else {
                pathBuilder.append("&counter=")
                    .append(encodeURIComponent(this._counters[0]));
            }
        }

        req.uri = pathBuilder.toString();
        return req;
    }

    private _prepareRequestWithMultipleCounters(
        pathBuilder: StringBuilder, request: HttpRequestParameters): HttpRequestParameters {
        const uniqueNames = new Set(this._counters);
        if (this._counters.reduce((result, next) => result + next.length, 0) < 1024) {
            for (const uniqueName of uniqueNames) {
                if (uniqueName) {
                    pathBuilder
                        .append("&counter=")
                        .append(encodeURIComponent(uniqueName));
                } 
            }
        } else {
            request = { method: "POST" } as any;
            const docOps = new DocumentCountersOperation();
            docOps.documentId = this._docId;
            docOps.operations = [];
            for (const counter of this._counters) {
                const counterOperation = new CounterOperation();
                counterOperation.type = "Get";
                counterOperation.counterName = counter;
                docOps.operations.push(counterOperation);
            }

            const batch = new CounterBatch();
            batch.documents = [docOps];
            request.body = JSON.stringify(batch.serialize(this._conventions));
            request.headers = this._headers().typeAppJson().build();
        }

        return request;
    }

    public get isReadRequest() {
        return true;
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body;
        this.result = await this._defaultPipeline(_ => body += _).process(bodyStream);
        return body;
    }
}
