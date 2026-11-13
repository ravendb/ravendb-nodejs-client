import { Stream } from "node:stream";
import { IOperation, OperationResultType } from "./OperationAbstractions.js";
import { JsonPatchDocument } from "./JsonPatchDocument.js";
import { PatchResultBase } from "./PatchResultBase.js";
import { JsonPatchCommandData } from "../Commands/Batches/JsonPatchCommandData.js";
import { IDocumentStore } from "../IDocumentStore.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { HttpCache } from "../../Http/HttpCache.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";
import { throwError } from "../../Exceptions/index.js";
import { DateUtil } from "../../Utility/DateUtil.js";
import { ObjectUtil } from "../../Utility/ObjectUtil.js";
import { ServerCasing, ServerResponse } from "../../Types/index.js";

export class JsonPatchResult extends PatchResultBase {
}

/**
 * Applies an RFC 6902 JsonPatch document to a single document in its own request.
 * The C# client calls this operation JsonPatchOperation.
 */
export class JsonPatchDocumentOperation implements IOperation<JsonPatchResult> {
    private readonly _id: string;
    private readonly _jsonPatchDocument: JsonPatchDocument;

    public constructor(id: string, jsonPatchDocument: JsonPatchDocument) {
        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        if (!jsonPatchDocument) {
            throwError("InvalidArgumentException", "JsonPatchDocument cannot be null");
        }

        this._id = id;
        this._jsonPatchDocument = jsonPatchDocument;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(
        store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<JsonPatchResult> {
        return new JsonPatchDocumentCommand(this._id, this._jsonPatchDocument, conventions);
    }
}

class JsonPatchDocumentCommand extends RavenCommand<JsonPatchResult> {
    private readonly _id: string;
    private readonly _jsonPatchDocument: JsonPatchDocument;
    private readonly _conventions: DocumentConventions;

    public constructor(id: string, jsonPatchDocument: JsonPatchDocument, conventions: DocumentConventions) {
        super();
        this._id = id;
        this._jsonPatchDocument = jsonPatchDocument;
        this._conventions = conventions;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/json-patch?id=" + encodeURIComponent(this._id);

        const body = JSON.stringify({
            Operations: this._jsonPatchDocument.operations
                .map(operation => JsonPatchCommandData.serializeOperation(operation, this._conventions))
        });

        return {
            method: "PATCH",
            uri,
            headers: this._headers().typeAppJson().build(),
            body
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        const json = await this._pipeline<ServerCasing<ServerResponse<JsonPatchResult>>>()
            .collectBody(_ => body = _)
            .parseJsonSync()
            .process(bodyStream);

        this.result = Object.assign(new JsonPatchResult(), {
            status: json.Status,
            modifiedDocument: ObjectUtil.transformDocumentKeys(json.ModifiedDocument, this._conventions),
            lastModified: DateUtil.utc.parse(json.LastModified),
            changeVector: json.ChangeVector,
            collection: json.Collection
        });

        return body;
    }
}
