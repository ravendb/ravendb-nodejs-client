import { Readable } from "node:stream";
import { Buffer } from "node:buffer";
import { IOperation, OperationResultType } from "../OperationAbstractions.js";
import { AttachmentDetails, AttachmentEnumeratorResult, AttachmentType } from "../../Attachments/index.js";
import { AttachmentRequest } from "./AttachmentRequest.js";
import { HttpRequestParameters, HttpResponse } from "../../../Primitives/Http.js";
import { RavenCommand, ResponseDisposeHandling } from "../../../Http/RavenCommand.js";
import { HttpCache } from "../../../Http/HttpCache.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { IDocumentStore } from "../../IDocumentStore.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { ObjectUtil } from "../../../Utility/ObjectUtil.js";
import { throwError } from "../../../Exceptions/index.js";

export class GetAttachmentsOperation implements IOperation<AsyncGenerator<AttachmentEnumeratorResult>> {
    private readonly _attachments: AttachmentRequest[];
    private readonly _type: AttachmentType;

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public constructor(attachments: AttachmentRequest[], type: AttachmentType) {
        this._attachments = attachments;
        this._type = type;
    }

    public getCommand(
        store: IDocumentStore,
        conventions: DocumentConventions,
        cache: HttpCache): RavenCommand<AsyncGenerator<AttachmentEnumeratorResult>> {
        return new GetAttachmentsCommand(this._attachments, this._type);
    }
}

export class GetAttachmentsCommand extends RavenCommand<AsyncGenerator<AttachmentEnumeratorResult>> {
    private readonly _attachments: AttachmentRequest[];
    private readonly _type: AttachmentType;

    public constructor(attachments: AttachmentRequest[], type: AttachmentType) {
        super();

        if (!attachments) {
            throwError("InvalidArgumentException", "Attachments cannot be null");
        }

        this._attachments = attachments;
        this._type = type;
        this._responseType = "Empty";
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        return {
            uri: node.url + "/databases/" + node.database + "/attachments/bulk",
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body: this._serializer.serialize({
                AttachmentType: this._type,
                Attachments: this._attachments.map(x => ({ DocumentId: x.documentId, Name: x.name }))
            })
        };
    }

    public async processResponse(
        cache: HttpCache,
        response: HttpResponse,
        bodyStream: Readable,
        url: string): Promise<ResponseDisposeHandling> {
        const reader = new AttachmentsResponseReader(bodyStream);
        const { attachmentsMetadata } = ObjectUtil.transformObjectKeys(
            await reader.readJsonObject(), { defaultTransform: ObjectUtil.camel }) as {
            attachmentsMetadata: AttachmentDetails[]
        };

        this.result = readAttachments(attachmentsMetadata, reader, bodyStream);
        return "Manually";
    }

    public get isReadRequest() {
        return true;
    }
}

async function* readAttachments(
    attachmentsMetadata: AttachmentDetails[],
    reader: AttachmentsResponseReader,
    bodyStream: Readable): AsyncGenerator<AttachmentEnumeratorResult> {
    let current: AttachmentStream;
    try {
        for (const details of attachmentsMetadata) {
            current = new AttachmentStream(reader, details.size);
            yield { details, data: current };
            await current.skipRemaining();
        }
    } finally {
        current?.destroy();
        bodyStream.destroy();
    }
}

const QUOTE = "\"".charCodeAt(0);
const BACKSLASH = "\\".charCodeAt(0);
const OPEN_BRACE = "{".charCodeAt(0);
const CLOSE_BRACE = "}".charCodeAt(0);

class AttachmentsResponseReader {
    private readonly _chunks: AsyncIterator<Buffer>;
    private _pending = Buffer.alloc(0);

    public constructor(bodyStream: Readable) {
        this._chunks = bodyStream[Symbol.asyncIterator]();
    }

    public async read(maxLength: number): Promise<Buffer> {
        if (!this._pending.length) {
            const { value, done } = await this._chunks.next();
            if (done) {
                throwError("InvalidOperationException", "Unexpected end of the attachments response");
            }

            this._pending = value;
        }

        const result = this._pending.subarray(0, maxLength);
        this._pending = this._pending.subarray(result.length);
        return result;
    }

    // the server writes the metadata object followed directly by the raw attachment bytes, with no delimiter
    public async readJsonObject(): Promise<object> {
        const parts: Buffer[] = [];
        let depth = 0;
        let inString = false;
        let escaped = false;

        for (;;) {
            const chunk = await this.read(Infinity);
            for (let i = 0; i < chunk.length; i++) {
                const byte = chunk[i];
                if (inString) {
                    if (escaped) {
                        escaped = false;
                    } else if (byte === BACKSLASH) {
                        escaped = true;
                    } else if (byte === QUOTE) {
                        inString = false;
                    }
                } else if (byte === QUOTE) {
                    inString = true;
                } else if (byte === OPEN_BRACE) {
                    depth++;
                } else if (byte === CLOSE_BRACE && --depth === 0) {
                    parts.push(chunk.subarray(0, i + 1));
                    this._pending = chunk.subarray(i + 1);
                    return JSON.parse(Buffer.concat(parts).toString("utf8"));
                }
            }

            parts.push(chunk);
        }
    }
}

class AttachmentStream extends Readable {
    private readonly _reader: AttachmentsResponseReader;
    private _remaining: number;
    private _pendingRead: Promise<void> = Promise.resolve();

    public constructor(reader: AttachmentsResponseReader, size: number) {
        super();
        this._reader = reader;
        this._remaining = size;
    }

    public _read(): void {
        this._pendingRead = this._readChunk();
    }

    private async _readChunk(): Promise<void> {
        try {
            const chunk = this._remaining ? await this._reader.read(this._remaining) : null;
            this._remaining -= chunk?.length ?? 0;
            this.push(chunk);
            if (chunk && !this._remaining) {
                this.push(null);
            }
        } catch (err) {
            this.destroy(err);
        }
    }

    public async skipRemaining(): Promise<void> {
        this.destroy();
        await this._pendingRead;
        while (this._remaining) {
            this._remaining -= (await this._reader.read(this._remaining)).length;
        }
    }
}
