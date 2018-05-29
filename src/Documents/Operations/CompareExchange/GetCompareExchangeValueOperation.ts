import { HttpRequestBase } from "../../../Primitives/Http";
import { DocumentType } from "../../DocumentAbstractions";
import { IOperation, OperationResultType } from "../OperationAbstractions";
import { CompareExchangeValue } from "./CompareExchangeValue";
import { RavenCommand } from "../../../Http/RavenCommand";
import { HttpCache } from "../../../Http/HttpCache";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { IDocumentStore } from "../../IDocumentStore";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import { ClassConstructor } from "../../../Types";
import { CompareExchangeValueResultParser } from "./CompareExchangeValueResultParser";

export class GetCompareExchangeValueOperation<T> implements IOperation<CompareExchangeValue<T>> {

    private _key: string;
    private _clazz: ClassConstructor<T>;

    public constructor(key: string, clazz?: ClassConstructor<T>) {
        this._key = key;
        this._clazz = clazz;
    }

    public getCommand(
        store: IDocumentStore,
        conventions: DocumentConventions,
        cache: HttpCache): RavenCommand<CompareExchangeValue<T>> {
        return new GetCompareExchangeValueCommand<T>(this._key, conventions, this._clazz);
    }

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }
}

export class GetCompareExchangeValueCommand<T> extends RavenCommand<CompareExchangeValue<T>> {
    private _key: string;
    private _clazz: ClassConstructor<T>;
    private _conventions: DocumentConventions;

    public constructor(key: string, conventions: DocumentConventions, clazz?: ClassConstructor<T>) {
        super();

        if (!key) {
            throwError("InvalidArgumentException", "The key argument must have value");
        }

        this._key = key;
        this._clazz = clazz;
        this._conventions = conventions;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/cmpxchg?key=" + encodeURIComponent(this._key);
        return { uri };
    }

    public setResponse(response: string, fromCache: boolean): void {
        this.result = CompareExchangeValueResultParser.getValue(response, this._conventions, this._clazz);
    }
}
