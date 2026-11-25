import { IOperation, OperationResultType } from "../OperationAbstractions.js";
import { AttachmentData, AttachmentDetails } from "../../Attachments/index.js";
import { IDocumentStore } from "../../IDocumentStore.js";
import { HttpCache } from "../../../Http/HttpCache.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { throwError } from "../../../Exceptions/index.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { PutAttachmentCommandHelper } from "../../Commands/Batches/PutAttachmentCommandHelper.js";

export class PutAttachmentOperation implements IOperation<AttachmentDetails> {
    private readonly _documentId: string;
    private readonly _name: string;
    private readonly _stream: AttachmentData;
    private readonly _contentType: string;
    private readonly _changeVector: string;

    public constructor(documentId: string, name: string, stream: AttachmentData);
    public constructor(documentId: string, name: string, stream: AttachmentData, contentType: string);
    public constructor(documentId: string, name: string, stream: AttachmentData,
                       contentType: string, changeVector: string);
    public constructor(documentId: string, name: string, stream: AttachmentData,
                       contentType?: string, changeVector?: string) {
        this._documentId = documentId;
        this._name = name;
        this._stream = stream;
        this._contentType = contentType;
        this._changeVector = changeVector;
    }

    public getCommand(store: IDocumentStore, conventions: DocumentConventions,
                      httpCache: HttpCache): RavenCommand<AttachmentDetails> {
        return new PutAttachmentCommand(this._documentId, this._name,
            this._stream, this._contentType, this._changeVector);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class PutAttachmentCommand extends RavenCommand<AttachmentDetails> {
    private readonly _documentId: string;
    private readonly _name: string;
    private readonly _stream: AttachmentData;
    private readonly _contentType: string;
    private readonly _changeVector: string;

    public constructor(documentId: string, name: string,
                       stream: AttachmentData, contentType: string, changeVector: string) {
        super();

        if (StringUtil.isNullOrWhitespace(documentId)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null or empty");
        }
        if (StringUtil.isNullOrWhitespace(name)) {
            throwError("InvalidArgumentException", "Name cannot be null or empty");
        }

        this._documentId = documentId;
        this._name = name;
        this._stream = stream;
        this._contentType = contentType;
        this._changeVector = changeVector;

        PutAttachmentCommandHelper.validateStream(stream);
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/" + node.database
            + "/attachments?id=" + encodeURIComponent(this._documentId)
            + "&name=" + encodeURIComponent(this._name);

        if (!StringUtil.isNullOrEmpty(this._contentType)) {
            uri += "&contentType=" + encodeURIComponent(this._contentType);
        }

        const req = {
            uri,
            method: "PUT",
            body: this._stream
        } as HttpRequestParameters;

        this._addChangeVectorIfNotNull(this._changeVector, req);

        return req;
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        let body: string = null;
        this.result = await this._defaultPipeline(_ => body = _)
            .process(bodyStream);
        return body;
    }

    public get isReadRequest() {
        return false;
    }
}
