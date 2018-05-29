import * as StringBuilder from "string-builder";
import { HttpRequestBase } from "../../../Primitives/Http";
import { IOperation, OperationResultType } from "../OperationAbstractions";
import { CompareExchangeValue } from "./CompareExchangeValue";
import { throwError } from "../../../Exceptions";
import { ClassConstructor } from "../../../Types";
import { IDocumentStore } from "../../IDocumentStore";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpCache } from "../../../Http/HttpCache";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { CompareExchangeValueResultParser } from "./CompareExchangeValueResultParser";

export interface GetCompareExchangeValuesParameters<T> {
    keys?: string[];

    startWith?: string;
    start?: number;
    pageSize?: number;

    clazz?: ClassConstructor<T>;
}

export class GetCompareExchangeValuesOperation<T> implements IOperation<{ [key: string]: CompareExchangeValue<T> }> {

    private _clazz: ClassConstructor<T>;
    private _keys: string[];

    private _startWith: string;
    private _start: number;
    private _pageSize: number;

    public get keys(): string[] {
        return this._keys;
    }

    public get startWith(): string {
        return this._startWith;
    }

    public get start(): number {
        return this._start;
    }

    public get pageSize(): number {
        return this._pageSize;
    }

    public get clazz(): ClassConstructor<T> {
        return this._clazz;
    }

    public constructor(parameters: GetCompareExchangeValuesParameters<T>) {
        this._clazz = parameters.clazz;

        if (parameters.keys) {
            if (!parameters.keys.length) {
                throwError("InvalidArgumentException", "Keys cannot be an empty array.");
            }

            this._keys = parameters.keys;
        } else if (parameters.startWith) {
            this._startWith = parameters.startWith;
            this._start = parameters.start;
            this._pageSize = parameters.pageSize;
        } else {
            throwError("InvalidArgumentException", "Please specify at least keys or startWith parameter");
        }
    }

    public getCommand(store: IDocumentStore, conventions: DocumentConventions, cache: HttpCache)
        : RavenCommand<{ [key: string]: CompareExchangeValue<T> }> {
        return new GetCompareExchangeValuesCommand(this, conventions);
    }

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }
}

export class GetCompareExchangeValuesCommand<T> extends RavenCommand<{ [key: string]: CompareExchangeValue<T> }> {
    private _operation: GetCompareExchangeValuesOperation<T>;
    private _conventions: DocumentConventions;

    public constructor(operation: GetCompareExchangeValuesOperation<T>, conventions: DocumentConventions) {
        super();
        this._operation = operation;
        this._conventions = conventions;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const pathBuilder = new StringBuilder(node.url);

        pathBuilder.append("/databases/")
            .append(node.database)
            .append("/cmpxchg?");

        if (this._operation.keys) {
            for (const key of this._operation.keys) {
                pathBuilder.append("&key=").append(encodeURIComponent(key));
            }
        } else {
            if (this._operation.startWith) {
                pathBuilder.append("&startsWith=")
                    .append(encodeURIComponent(this._operation.startWith));
            }

            if (this._operation.start) {
                pathBuilder.append("&start=")
                    .append(this._operation.start);
            }

            if (this._operation.pageSize) {
                pathBuilder.append("&pageSize=")
                    .append(this._operation.pageSize);
            }
        }

        const uri = pathBuilder.toString();

        return { uri };
    }

    public setResponse(response: string, fromCache: boolean): void {
        this.result = CompareExchangeValueResultParser.getValues(response, this._conventions, this._operation.clazz);
    }
}
