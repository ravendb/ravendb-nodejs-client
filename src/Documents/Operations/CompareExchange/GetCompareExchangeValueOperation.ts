import { HttpRequestParameters } from "../../../Primitives/Http";
import { IOperation, OperationResultType } from "../OperationAbstractions";
import { CompareExchangeValue } from "./CompareExchangeValue";
import { RavenCommand } from "../../../Http/RavenCommand";
import { HttpCache } from "../../../Http/HttpCache";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { IDocumentStore } from "../../IDocumentStore";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import { ClassConstructor } from "../../../Types";
import { CompareExchangeValueResultParser, GetCompareExchangeValuesResponse } from "./CompareExchangeValueResultParser";
import * as stream from "readable-stream";

export class GetCompareExchangeValueOperation<T> implements IOperation<CompareExchangeValue<T>> {

    private readonly _key: string;
    private readonly _materializeMetadata: boolean;
    private readonly _clazz: ClassConstructor<T>;

    public constructor(key: string, clazz?: ClassConstructor<T>, materializeMetadata: boolean = true) {
        this._key = key;
        this._clazz = clazz;
        this._materializeMetadata = materializeMetadata;
    }

    public getCommand(
        store: IDocumentStore,
        conventions: DocumentConventions,
        cache: HttpCache): RavenCommand<CompareExchangeValue<T>> {
        return new GetCompareExchangeValueCommand<T>(this._key, this._materializeMetadata, conventions, this._clazz);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class GetCompareExchangeValueCommand<T> extends RavenCommand<CompareExchangeValue<T>> {
    private readonly _key: string;
    private readonly _clazz: ClassConstructor<T>;
    private readonly _materializeMetadata: boolean;
    private readonly _conventions: DocumentConventions;

    public constructor(key: string, materializeMetadata: boolean, conventions: DocumentConventions, clazz?: ClassConstructor<T>) {
        super();

        if (!key) {
            throwError("InvalidArgumentException", "The key argument must have value");
        }

        this._key = key;
        this._clazz = clazz;
        this._materializeMetadata = materializeMetadata;
        this._conventions = conventions;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/cmpxchg?key=" + encodeURIComponent(this._key);
        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return null;
        }

        let body: string = null;
        const results = await this._pipeline<GetCompareExchangeValuesResponse>()
            .collectBody(x => body = x)
            .parseJsonAsync()
            .jsonKeysTransform("GetCompareExchangeValue", this._conventions)
            .process(bodyStream);

        this.result = CompareExchangeValueResultParser.getValue(
                results as GetCompareExchangeValuesResponse, this._materializeMetadata, this._conventions, this._clazz);
        return body;
    }
}
