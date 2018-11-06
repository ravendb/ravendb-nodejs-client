import { IOperation, OperationResultType } from "../OperationAbstractions";
import { CountersDetail } from "./CountersDetail";
import { CounterBatch } from "./CounterBatch";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { IDocumentStore } from "../../IDocumentStore";
import { HttpCache } from "../../../Http/HttpCache";
import { RavenCommand } from "../../../Http/RavenCommand";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";

export class CounterBatchOperation implements IOperation<CountersDetail> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    private readonly _counterBatch: CounterBatch;

    public constructor(counterBatch: CounterBatch) {
        this._counterBatch = counterBatch;
    }

    public getCommand(
        store: IDocumentStore, conventions: DocumentConventions, cache: HttpCache): RavenCommand<CountersDetail> {
        return new CounterBatchCommand(this._counterBatch, conventions);
    }
}

export class CounterBatchCommand extends RavenCommand<CountersDetail> {
    private readonly _conventions: DocumentConventions;
    private readonly _counterBatch: CounterBatch;

    public constructor(counterBatch: CounterBatch, conventions: DocumentConventions) {
        super();
        if (!counterBatch) {
            throwError("InvalidArgumentException", "CounterBatch cannot be null.");
        }

        this._counterBatch = counterBatch;
        this._conventions = conventions;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
    const uri = node.url + "/databases/" + node.database + "/counters";
    const body = JSON.stringify(this._counterBatch.serialize(this._conventions));
    return {
        method: "POST",
        uri,
        body,
        headers: this._headers().typeAppJson().build()
    };
}
    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        return await this._parseResponseDefaultAsync(bodyStream);
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
