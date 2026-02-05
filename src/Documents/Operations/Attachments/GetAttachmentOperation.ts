import { IOperation, OperationResultType } from "../OperationAbstractions.js";
import { AttachmentDetails, AttachmentResult, AttachmentType } from "../../Attachments/index.js";
import { getEtagHeader } from "../../../Utility/HttpUtil.js";
import { HttpRequestParameters, HttpResponse } from "../../../Primitives/Http.js";
import { RavenCommand, ResponseDisposeHandling } from "../../../Http/RavenCommand.js";
import { HttpCache } from "../../../Http/HttpCache.js";
import { IDocumentStore } from "../../IDocumentStore.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { throwError } from "../../../Exceptions/index.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { Readable } from "node:stream";
import { HEADERS } from "../../../Constants.js";
import { RemoteAttachmentFlags } from "../../Attachments/RemoteAttachmentFlags.js";
import { RemoteAttachmentParameters } from "./RemoteAttachmentParameters.js";
import { DateUtil } from "../../../Utility/DateUtil.js";

export class GetAttachmentOperation implements IOperation<AttachmentResult> {
    private readonly _documentId: string;
    private readonly _name: string;
    private readonly _type: AttachmentType;
    private readonly _changeVector: string;

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public constructor(documentId: string, name: string, type: AttachmentType, changeVector: string) {
        this._documentId = documentId;
        this._name = name;
        this._type = type;
        this._changeVector = changeVector;
    }

    public getCommand(
        store: IDocumentStore, conventions: DocumentConventions, cache: HttpCache): RavenCommand<AttachmentResult> {
        return new GetAttachmentCommand(
            this._documentId, this._name, this._type, this._changeVector);
    }

}

interface InternalRemoteAttachmentParameters {
    identifier: string;
    flags: RemoteAttachmentFlags;
    at: Date;
}

export class GetAttachmentCommand extends RavenCommand<AttachmentResult> {
    private readonly _documentId: string;
    private readonly _name: string;
    private readonly _type: AttachmentType;
    private readonly _changeVector: string;

    public constructor(documentId: string, name: string, type: AttachmentType, changeVector: string) {
        super();

        this.result = null;

        if (StringUtil.isNullOrWhitespace(documentId)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null or empty");
        }
        if (StringUtil.isNullOrWhitespace(name)) {
            throwError("InvalidArgumentException", "Name cannot be null or empty");
        }
        if (type !== "Document" && !changeVector) {
            throwError("InvalidArgumentException", "Change vector cannot be null for attachment type " + type);
        }

        this._documentId = documentId;
        this._name = name;
        this._type = type;
        this._changeVector = changeVector;
        this._responseType = "Empty";
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/attachments?id="
            + encodeURIComponent(this._documentId) + "&name=" + encodeURIComponent(this._name);

        if (this._type !== "Document") {
            const body = this._serializer.serialize({ Type: this._type, ChangeVector: this._changeVector });

            return {
                uri,
                method: "POST",
                body
            };
        }
        return { uri };
    }

    public async processResponse(
        cache: HttpCache,
        response: HttpResponse,
        bodyStream: Readable,
        url: string): Promise<ResponseDisposeHandling> {
        const contentType = response.headers.get("content-type");
        const changeVector = getEtagHeader(response);
        const hash = response.headers.get("attachment-hash") as string;
        let size = 0;
        const sizeHeader = response.headers.get("attachment-size") as string;
        const remoteParametersIdentifier = response.headers.get(HEADERS.ATTACHMENT_REMOTE_PARAMETERS_IDENTIFIER) as string;
        const remoteParametersAt = response.headers.get(HEADERS.ATTACHMENT_REMOTE_PARAMETERS_AT) as string; // iso date
        const remoteParametersFlags = response.headers.get(HEADERS.ATTACHMENT_REMOTE_PARAMETERS_FLAGS) as RemoteAttachmentFlags;

        if (sizeHeader) {
            size = Number.parseInt(sizeHeader, 10);
        }

        const details: AttachmentDetails = {
            name: this._name,
            documentId: this._documentId,
            contentType,
            hash,
            changeVector,
            size
        };

        if (remoteParametersIdentifier && remoteParametersAt && remoteParametersFlags) {
            const remoteParameters: InternalRemoteAttachmentParameters = {
                at: DateUtil.utc.parse(remoteParametersAt),
                identifier: remoteParametersIdentifier,
                flags: remoteParametersFlags,
            }

            details.remoteParameters = remoteParameters as RemoteAttachmentParameters
        }


        this.result = new AttachmentResult(bodyStream, details, response);
        return "Manually";
    }

    public get isReadRequest() {
        return true;
    }
}