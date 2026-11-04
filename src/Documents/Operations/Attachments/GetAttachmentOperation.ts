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
import { TypeUtil } from "../../../Utility/TypeUtil.js";
import { StatusCodes } from "../../../Http/StatusCode.js";

export class GetAttachmentOperation implements IOperation<AttachmentResult> {
    private readonly _documentId: string;
    private readonly _name: string;
    private readonly _type: AttachmentType;
    private readonly _changeVector: string;
    private readonly _from: number;
    private readonly _to: number;

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public constructor(documentId: string, name: string, type: AttachmentType, changeVector: string, from?: number, to?: number) {
        this._documentId = documentId;
        this._name = name;
        this._type = type;
        this._changeVector = changeVector;
        this._from = from;
        this._to = to;
    }

    public getCommand(
        store: IDocumentStore, conventions: DocumentConventions, cache: HttpCache): RavenCommand<AttachmentResult> {
        return new GetAttachmentCommand(
            this._documentId, this._name, this._type, this._changeVector, this._from, this._to);
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
    private readonly _from: number;
    private readonly _to: number;

    public constructor(documentId: string, name: string, type: AttachmentType, changeVector: string, from?: number, to?: number) {
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
        if (from < 0 || to < 0) {
            throwError("ArgumentOutOfRangeException", "Range bounds cannot be negative");
        }
        if (!TypeUtil.isNullOrUndefined(from) && !TypeUtil.isNullOrUndefined(to) && from > to) {
            throwError("ArgumentOutOfRangeException", "Range start cannot be greater than range end");
        }

        this._documentId = documentId;
        this._name = name;
        this._type = type;
        this._changeVector = changeVector;
        this._from = from;
        this._to = to;
        this._responseType = "Empty";
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/attachments?id="
            + encodeURIComponent(this._documentId) + "&name=" + encodeURIComponent(this._name);

        const headers = TypeUtil.isNullOrUndefined(this._from) && TypeUtil.isNullOrUndefined(this._to)
            ? undefined
            : { Range: `bytes=${this._from ?? ""}-${this._to ?? ""}` };

        if (this._type !== "Document") {
            const body = this._serializer.serialize({ Type: this._type, ChangeVector: this._changeVector });

            return {
                uri,
                method: "POST",
                body,
                headers
            };
        }
        return { uri, headers };
    }

    public onResponseFailure(response: HttpResponse): void {
        if (response.status === StatusCodes.RequestedRangeNotSatisfiable) {
            throwError("InvalidAttachmentRangeException",
                `The requested range '${this._from ?? ""}-${this._to ?? ""}' is invalid for '${this._name}' in document '${this._documentId}'.`);
        }
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