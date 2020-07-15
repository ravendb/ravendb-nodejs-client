import { HttpRequestParameters } from "../../../Primitives/Http";
import { IOperation, OperationResultType } from "../OperationAbstractions";
import { CompareExchangeResult, CompareExchangeResultResponse } from "./CompareExchangeResult";
import { ClassConstructor } from "../../../Types";
import { IDocumentStore } from "../../IDocumentStore";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpCache } from "../../../Http/HttpCache";
import { RavenCommand } from "../../../Http/RavenCommand";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class DeleteCompareExchangeValueOperation<T> implements IOperation<CompareExchangeResult<T>> {

    private readonly _key: string;
    private readonly _index: number;
    private readonly _clazz: ClassConstructor<T>;

    public constructor(key: string, index: number, clazz?: ClassConstructor<T>) {
        this._key = key;
        this._index = index;
        this._clazz = clazz;
    }

    public getCommand(store: IDocumentStore, conventions: DocumentConventions, cache: HttpCache)
        : RavenCommand<CompareExchangeResult<T>> {
        return new RemoveCompareExchangeCommand(this._key, this._index, conventions, this._clazz);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class RemoveCompareExchangeCommand<T> extends RavenCommand<CompareExchangeResult<T>> implements IRaftCommand {
    private readonly _key: string;
    private readonly _index: number;
    private readonly _clazz: ClassConstructor<T>;
    private readonly _conventions: DocumentConventions;

    public constructor(key: string, index: number, conventions: DocumentConventions, clazz?: ClassConstructor<T>) {
        super();

        if (!key) {
            throwError("InvalidArgumentException", "The key argument must have value.");
        }

        this._clazz = clazz;
        this._key = key;
        this._index = index;
        this._conventions = conventions;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/cmpxchg?key=" + encodeURIComponent(this._key) 
            + "&index=" + this._index;
        return {
            method: "DELETE",
            uri
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        let body: string = null;
        const resObj = await this._pipeline<CompareExchangeResultResponse>()
            .collectBody(_ => body = _)
            .parseJsonAsync()
            .jsonKeysTransform("CompareExchangeValue", this._conventions)
            .process(bodyStream);
        this.result = CompareExchangeResult.parseFromObject(resObj, this._conventions, this._clazz);
        return body;
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
