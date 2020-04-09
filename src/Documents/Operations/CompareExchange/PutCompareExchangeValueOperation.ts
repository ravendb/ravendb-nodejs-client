import { HttpRequestParameters } from "../../../Primitives/Http";
import { IOperation, OperationResultType } from "../OperationAbstractions";
import { CompareExchangeResult, CompareExchangeResultResponse } from "./CompareExchangeResult";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IDocumentStore } from "../../IDocumentStore";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpCache } from "../../../Http/HttpCache";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";
import { ClassConstructor, ObjectTypeDescriptor } from "../../..";
import { TypeUtil } from "../../../Utility/TypeUtil";
import * as stream from "readable-stream";
import { streamValues } from "stream-json/streamers/StreamValues";
import { streamArray } from "stream-json/streamers/StreamArray";
import { pick } from "stream-json/filters/Pick";
import { ignore } from "stream-json/filters/Ignore";

export class PutCompareExchangeValueOperation<T> implements IOperation<CompareExchangeResult<T>> {

    private readonly _key: string;
    private readonly _value: T;
    private readonly _index: number;

    public constructor(key: string, value: T, index: number) {
        this._key = key;
        this._value = value;
        this._index = index;
    }

    public getCommand(
        store: IDocumentStore,
        conventions: DocumentConventions,
        cache: HttpCache): RavenCommand<CompareExchangeResult<T>> {
        return new PutCompareExchangeValueCommand<T>(this._key, this._value, this._index, conventions);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class PutCompareExchangeValueCommand<T> extends RavenCommand<CompareExchangeResult<T>> {
    private readonly _key: string;
    private readonly _value: T;
    private readonly _index: number;
    private readonly _conventions: DocumentConventions;

    public constructor(
        key: string,
        value: T,
        index: number,
        conventions: DocumentConventions) {
        super();

        if (!key) {
            throwError("InvalidArgumentException", "The key argument must have value");
        }

        if (index < 0) {
            throwError("InvalidArgumentException", "Index must be a non-negative number");
        }

        this._key = key;
        this._value = value;
        this._index = index;
        this._conventions = conventions || DocumentConventions.defaultConventions;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/cmpxchg?key=" + encodeURIComponent(this._key) + "&index=" + this._index;

        const tuple = {};
        tuple["Object"] = TypeUtil.isPrimitive(this._value)
            ? this._value
            : this._conventions.transformObjectKeysToRemoteFieldNameConvention(this._value as any);

        return {
            method: "PUT",
            uri,
            body: JsonSerializer.getDefault().serialize(tuple),
            headers: this._headers().typeAppJson().build()
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        let body: string = null;

        const resObj = await this._pipeline<CompareExchangeResultResponse>()
            .collectBody(_ => body = _)
            .parseJsonAsync()
            .jsonKeysTransform("CompareExchangeValue", this._conventions)
            .process(bodyStream);

        const type = !TypeUtil.isPrimitive(this._value)
            ? this._conventions.getTypeDescriptorByEntity(this._value as any) as ObjectTypeDescriptor
            : null;
        const clazz: ClassConstructor<T> = TypeUtil.isClass(type) ? type as any : null;
        this.result = CompareExchangeResult.parseFromObject(resObj, this._conventions, clazz);

        return body;
    }
}
