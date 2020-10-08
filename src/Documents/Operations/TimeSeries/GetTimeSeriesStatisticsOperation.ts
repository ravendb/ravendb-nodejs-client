import { IOperation, OperationResultType } from "../OperationAbstractions";
import { TimeSeriesStatistics } from "./TimeSeriesStatistics";
import { IDocumentStore } from "../../IDocumentStore";
import { DocumentConventions, RavenCommand, ServerNode } from "../../..";
import { HttpCache } from "../../../Http/HttpCache";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";

export class GetTimeSeriesStatisticsOperation implements IOperation<TimeSeriesStatistics> {
    private readonly _documentId: string;

    /**
     * Retrieve start, end and total number of entries for all time-series of a given document
     * @param documentId Document id
     */
    constructor(documentId: string) {
        this._documentId = documentId;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<TimeSeriesStatistics> {
        return new GetTimeSeriesStatisticsCommand(this._documentId);
    }
}

class GetTimeSeriesStatisticsCommand extends RavenCommand<TimeSeriesStatistics> {
    private readonly _documentId: string;

    public constructor(documentId: string) {
        super();

        this._documentId = documentId;
    }

    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/timeseries?stats?docId" + this._urlEncode(this._documentId);

        return {
            method: "GET",
            uri
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }
}
