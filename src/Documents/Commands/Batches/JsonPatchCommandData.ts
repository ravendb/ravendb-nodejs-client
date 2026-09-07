import { CommandType, ICommandData } from "../CommandData.js";
import { JsonPatchDocument, JsonPatchOperation } from "../../Operations/JsonPatchDocument.js";
import { throwError } from "../../../Exceptions/index.js";
import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";

/**
 * Applies an RFC 6902 JsonPatch document to a single document as part of session.saveChanges().
 * Unlike PatchCommandData no JavaScript runs on the server; the operations are applied directly.
 */
export class JsonPatchCommandData implements ICommandData {
    public readonly id: string;
    public readonly name: string = null;
    public readonly changeVector: string = null;
    public readonly jsonPatch: JsonPatchDocument;
    public readonly type: CommandType = "JsonPatch";
    public returnDocument: boolean = false;

    public constructor(id: string, jsonPatch: JsonPatchDocument) {
        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        if (!jsonPatch) {
            throwError("InvalidArgumentException", "JsonPatch cannot be null");
        }

        this.id = id;
        this.jsonPatch = jsonPatch;
    }

    public serialize(conventions: DocumentConventions): object {
        return {
            Id: this.id,
            ChangeVector: null,
            JsonPatch: {
                Operations: this.jsonPatch.operations.map(operation => JsonPatchCommandData._serializeOperation(operation, conventions))
            },
            ReturnDocument: this.returnDocument,
            Type: this.type
        };
    }

    public onBeforeSaveChanges(session: InMemoryDocumentSessionOperations): void {
        this.returnDocument = session.isLoaded(this.id);
    }

    private static _serializeOperation(operation: JsonPatchOperation, conventions: DocumentConventions): Record<string, unknown> {
        const serialized: Record<string, unknown> = { op: operation.op };

        if (operation.from !== undefined) {
            serialized.from = operation.from;
        }

        serialized.path = operation.path;

        if (operation.op === "add" || operation.op === "replace" || operation.op === "test") {
            // undefined is not representable in JSON; the server requires a "value" for these ops
            serialized.value = JsonPatchCommandData._serializeValue(operation.value ?? null, conventions);
        }

        return serialized;
    }

    private static _serializeValue(value: unknown, conventions: DocumentConventions): unknown {
        if (value === null || typeof value !== "object") {
            return value;
        }

        // same treatment as PatchRequest.serialize() gives to script arguments
        const literal = conventions.objectMapper.toObjectLiteral(value);
        return conventions.transformObjectKeysToRemoteFieldNameConvention(literal);
    }
}
