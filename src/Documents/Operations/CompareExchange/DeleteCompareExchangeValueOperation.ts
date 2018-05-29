import { HttpRequestBase } from '../../../Primitives/Http';
import { IOperation, OperationResultType } from "../OperationAbstractions";
import { CompareExchangeResult } from "./CompareExchangeResult";
import { ClassConstructor } from "../../../Types";
import { IDocumentStore } from "../../IDocumentStore";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpCache } from "../../../Http/HttpCache";
import { RavenCommand } from "../../../Http/RavenCommand";
import { throwError } from "../../../Exceptions";
import { ServerNode } from '../../../Http/ServerNode';

export class DeleteCompareExchangeValueOperation<T> implements IOperation<CompareExchangeResult<T>> {

    private _key: string;
    private _index: number;
    private _clazz: ClassConstructor<T>;

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
        return "COMMAND_RESULT";
    }

}

export class RemoveCompareExchangeCommand<T> extends RavenCommand<CompareExchangeResult<T>> {
    private _key: string;
    private _index: number;
    private _clazz: ClassConstructor<T>;
    private _conventions: DocumentConventions;

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

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/cmpxchg?key=" + this._key + "&index=" + this._index;
        return {
            method: "DELETE",
            uri
        };
    }

    public setResponse(response: string, fromCache: boolean): void {
        this.result = CompareExchangeResult.parseFromString(response, this._conventions, this._clazz);
    }
}
