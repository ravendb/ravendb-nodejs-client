import {IMaintenanceOperation, OperationResultType} from "../OperationAbstractions";
import {throwError} from "../../../Exceptions";
import {RavenCommand} from "../../../Http/RavenCommand";
import {DocumentConventions} from "../../Conventions/DocumentConventions";
import {ServerNode} from "../../..";
import {HttpRequestParameters} from "../../../Primitives/Http";
import * as stream from "readable-stream";

export class GetTermsOperation implements IMaintenanceOperation<string[]> {

    private readonly _indexName: string;
    private readonly _field: string;
    private readonly _fromValue: string;
    private readonly _pageSize: number;

    public constructor(indexName: string, field: string, fromValue: string);
    public constructor(indexName: string, field: string, fromValue: string, pageSize: number);
    public constructor(indexName: string, field: string, fromValue: string, pageSize: number = null) {
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null");
        }

        if (!field) {
            throwError("InvalidArgumentException", "Field cannot be null");
        }

        this._indexName = indexName;
        this._field = field;
        this._fromValue = fromValue;
        this._pageSize = pageSize;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<string[]> {
        return new GetTermsCommand(this._indexName, this._field, this._fromValue, this._pageSize);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class GetTermsCommand extends RavenCommand<string[]> {

    private readonly _indexName: string;
    private readonly _field: string;
    private readonly _fromValue: string;
    private readonly _pageSize: number;

    public constructor(indexName: string, field: string, fromValue: string);
    public constructor(indexName: string, field: string, fromValue: string, pageSize: number);
    public constructor(indexName: string, field: string, fromValue: string, pageSize: number = null) {
        super();

        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null");
        }

        if (!field) {
            throwError("InvalidArgumentException", "Field cannot be null");
        }

        this._indexName = indexName;
        this._field = field;
        this._fromValue = fromValue;
        this._pageSize = pageSize;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/indexes/terms?name=" +
            encodeURIComponent(this._indexName) + "&field=" + encodeURIComponent(this._field) +
            "&fromValue=" + (this._fromValue || "") + "&pageSize=" + (this._pageSize || "");

        return {uri};
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        await this._defaultPipeline(_ => body = _).process(bodyStream)
            .then(results => {
                this.result = results["terms"];
            });
        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}

export interface TermsQueryResult {
    terms: string[];
    resultEtag: number;
    indexName: string;
}
