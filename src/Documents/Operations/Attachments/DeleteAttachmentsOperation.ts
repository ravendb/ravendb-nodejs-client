import { IOperation, OperationResultType } from "../OperationAbstractions.js";
import { HttpCache } from "../../../Http/HttpCache.js";
import { throwError } from "../../../Exceptions/index.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { IDocumentStore } from "../../IDocumentStore.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { AttachmentRequest } from "./AttachmentRequest.js";

export class DeleteAttachmentsOperation implements IOperation<void> {
    private readonly _attachments: AttachmentRequest[];

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public constructor(attachments: AttachmentRequest[]) {
        if (!attachments?.length) {
            throwError("InvalidArgumentException", "Attachments cannot be null or empty");
        }

        this._attachments = attachments;
    }

    public getCommand(
        store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<void> {
        return new DeleteAttachmentsCommand(this._attachments);
    }
}

class DeleteAttachmentsCommand extends RavenCommand<void> {
    private readonly _attachments: AttachmentRequest[];

    public constructor(attachments: AttachmentRequest[]) {
        super();
        this._attachments = attachments;
    }

    public get isReadRequest() {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/attachments/bulk";

        const body = JSON.stringify({
            Attachments: this._attachments.map(x => ({
                DocumentId: x.documentId,
                Name: x.name
            }))
        });

        return {
            uri,
            method: "DELETE",
            headers: this._headers().typeAppJson().build(),
            body
        };
    }
}
