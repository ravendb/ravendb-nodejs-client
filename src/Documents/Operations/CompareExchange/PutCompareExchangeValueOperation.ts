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
import { TypeUtil } from "../../../Utility/TypeUtil";
import * as stream from "readable-stream";
import { ObjectTypeDescriptor, ClassConstructor } from "../../../Types";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { IMetadataDictionary } from "../../..";
import { COMPARE_EXCHANGE } from "../../../Constants";

export class PutCompareExchangeValueOperation<T> implements IOperation<CompareExchangeResult<T>> {

    private readonly _key: string;
    private readonly _value: T;
    private readonly _index: number;
    private readonly _metadata: IMetadataDictionary;

    public constructor(key: string, value: T, index: number)
    public constructor(key: string, value: T, index: number, metadata: IMetadataDictionary)
    public constructor(key: string, value: T, index: number, metadata?: IMetadataDictionary) {
        this._key = key;
        this._value = value;
        this._index = index;
        this._metadata = metadata;
    }

    public getCommand(
        store: IDocumentStore,
        conventions: DocumentConventions,
        cache: HttpCache): RavenCommand<CompareExchangeResult<T>> {
        return new PutCompareExchangeValueCommand<T>(this._key, this._value, this._index, this._metadata, conventions);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class PutCompareExchangeValueCommand<T> extends RavenCommand<CompareExchangeResult<T>> implements IRaftCommand {
    private readonly _key: string;
    private readonly _value: T;
    private readonly _index: number;
    private readonly _conventions: DocumentConventions;
    private readonly _metadata: IMetadataDictionary;

    public constructor(
        key: string,
        value: T,
        index: number,
        metadata: IMetadataDictionary,
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
        this._metadata = metadata;
        this._conventions = conventions || DocumentConventions.defaultConventions;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/cmpxchg?key=" + encodeURIComponent(this._key) + "&index=" + this._index;

        const tuple = {};
        tuple[COMPARE_EXCHANGE.OBJECT_FIELD_NAME] = TypeUtil.isPrimitive(this._value)
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

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
