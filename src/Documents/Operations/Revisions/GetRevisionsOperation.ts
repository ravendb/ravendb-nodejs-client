import { IOperation, OperationResultType } from "../OperationAbstractions";
import { RevisionsResult } from "./RevisionsResult";
import { DocumentType } from "../../DocumentAbstractions";
import { IDocumentStore } from "../../IDocumentStore";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpCache } from "../../../Http/HttpCache";
import { RavenCommand } from "../../../Http/RavenCommand";
import { GetRevisionsCommand } from "../../Commands/GetRevisionsCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";

export class GetRevisionsOperation<T extends object> implements IOperation<RevisionsResult<T>> {
    private readonly _parameters: GetRevisionsParameters<T>;
    private readonly _id: string;

    public constructor(id: string, parameters: GetRevisionsParameters<T> = {}) {
        this._id = id;
        this._parameters = parameters;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }


    getCommand(store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<RevisionsResult<T>> {
        return new GetRevisionsResultCommand(this._id, this._parameters, conventions);
    }
}
class GetRevisionsResultCommand<T extends object> extends RavenCommand<RevisionsResult<T>> {
    private readonly _parameters: GetRevisionsParameters<T>;
    private readonly conventions: DocumentConventions;
    private readonly _id: string;
    private readonly _cmd: GetRevisionsCommand;

    public constructor(id: string, parameters: GetRevisionsParameters<T>, conventions: DocumentConventions) {
        super();
        this.conventions = conventions;
        this._id = id;
        this._parameters = parameters;
        this._cmd = new GetRevisionsCommand(conventions, id, parameters.start, parameters.pageSize);
    }

    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        return this._cmd.createRequest(node);
    }


    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return ;
        }

        let body: string;

        const responseNode = await this._pipeline<any>()
            .parseJsonSync()
            .collectBody(b => body = b)
            .process(bodyStream);

        if (!responseNode.Results) {
            return body;
        }

        const revisions = responseNode.Results;

        const total = responseNode.TotalResults;

        const result = new RevisionsResult<T>();
        result.totalResults = total;
        result.results = revisions.filter(x => x).map(x => {
            const entityType = this.conventions.getJsTypeByDocumentType(this._parameters.documentType);
            return this.conventions.deserializeEntityFromJson(entityType, x);
        });

        this.result = result;
    }
}

export interface GetRevisionsParameters<T extends object> {
    documentType?: DocumentType<T>;
    start?: number;
    pageSize?: number;
}