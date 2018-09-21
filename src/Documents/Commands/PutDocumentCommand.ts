import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import { HeadersBuilder } from "../../Utility/HttpUtil";
import * as stream from "readable-stream";
import { JsonSerializer } from "../../Mapping/Json/Serializer";

export interface PutResult {
    id: string;
    changeVector: string;
}

export class PutDocumentCommand extends RavenCommand<PutResult> {

    private _id: string;
    private _changeVector: string;
    private _document: object;

    public constructor(id: string, changeVector: string, document: object) {
        super();

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null or undefined.");
        }

        if (!document) {
            throwError("InvalidArgumentException", "Document cannot be null or undefined.");
        }

        this._id = id;
        this._changeVector = changeVector;
        this._document = document;
    }

    protected get _serializer(): JsonSerializer {
        const serializer = super._serializer;
        serializer.replacerRules.length = 0;
        return serializer;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/docs?id=${encodeURIComponent(this._id)}`;

        // we don't use conventions here on purpose
        // doc that's got here should already have proper casing
        const body = this._serializer.serialize(this._document);
        const req = {
            uri,
            method: "PUT",
            body,
            headers: HeadersBuilder.create()
                .typeAppJson()
                .build()
        };

        this._addChangeVectorIfNotNull(this._changeVector, req);

        return req;
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
