import { Readable } from "node:stream";
import { HttpResponse } from "../../Primitives/Http.js";
import { closeHttpResponse } from "../../Utility/HttpUtil.js";
import { CapitalizeType } from "../../Types/index.js";
import { RemoteAttachmentFlags } from "./RemoteAttachmentFlags.js";

export type AttachmentType = "Document" | "Revision";

export interface AttachmentName {
    name: string;
    hash: string;
    contentType: string;
    size: number;
    remoteParameters?: RemoteAttachmentFlags;
}

export interface AttachmentNameWithCount extends AttachmentName {
    count: number;
}

export interface IAttachmentObject extends CapitalizeType<AttachmentName> {
    getContentAsString(): string;
    getContentAsString(encoding: string): string;
    getContentAsStream(): any;
}

export interface AttachmentDetails extends AttachmentName {
    changeVector: string;
    documentId?: string;
}

export class AttachmentResult {

    constructor(
        public data: Readable,
        public details: AttachmentDetails,
        private _response: HttpResponse) {
        // empty
    }

    public dispose() {
        return closeHttpResponse(this._response);
    }
}

export type AttachmentData = Readable | Buffer;
