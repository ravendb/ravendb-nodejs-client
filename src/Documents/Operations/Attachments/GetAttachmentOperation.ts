import { IOperation, OperationResultType } from "../OperationAbstractions";
import { AttachmentDetails } from "./../../Attachments/index";
import { getEtagHeader } from "./../../../Utility/HttpUtil";
import { HttpRequestParameters, HttpResponse } from "./../../../Primitives/Http";
import { AttachmentResult, AttachmentType } from "../../Attachments";
import { RavenCommand, ResponseDisposeHandling } from "../../../Http/RavenCommand";
import { HttpCache } from "../../../Http/HttpCache";
import { IDocumentStore } from "../../IDocumentStore";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { throwError } from "../../../Exceptions";
import { StringUtil } from "../../../Utility/StringUtil";
import { ServerNode } from "../../../Http/ServerNode";
import { StatusCodes } from "../../../Http/StatusCode";
import * as stream from "readable-stream";

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

export class GetAttachmentCommand extends RavenCommand<AttachmentResult> {
    private readonly _documentId: string;
    private readonly _name: string;
    private readonly _type: AttachmentType;
    private readonly _changeVector: string;

    public constructor(documentId: string, name: string, type: AttachmentType, changeVector: string) {
        super();

        if (StringUtil.isWhitespace(documentId)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null or empty");
        }
        if (StringUtil.isWhitespace(name)) {
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
        bodyStream: stream.Readable,
        url: string): Promise<ResponseDisposeHandling> {
        const contentType = response.caseless.get("content-type");
        const changeVector = getEtagHeader(response);
        const hash = response.caseless.get("attachment-hash") as string;
        let size = 0;
        const sizeHeader = response.caseless.get("attachment-size") as string;
        if (sizeHeader) {
            size = parseInt(sizeHeader, 10);
        }

        const details: AttachmentDetails = {
            name: this._name,
            documentId: this._documentId,
            contentType,
            hash,
            changeVector,
            size
        };

        this.result = new AttachmentResult(bodyStream, details, response);
        return "Manually";
    }
    
    public get isReadRequest() {
        return true;
    }
}
