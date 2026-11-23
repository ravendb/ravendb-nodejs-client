import { Readable } from "node:stream";
import { throwError } from "../../../Exceptions/index.js";
import { AttachmentData } from "../../Attachments/index.js";

export class PutAttachmentCommandHelper {
    public static throwStreamWasAlreadyUsed(): void {
        throwError("InvalidOperationException",
            "It is forbidden to re-use the same InputStream for more than one attachment. "
            + "Use a unique InputStream per put attachment command.");
    }

    public static validateStream(stream: AttachmentData): void {
        if (stream instanceof Readable && !stream.readable) {
            throwError("InvalidOperationException",
                "Cannot put an attachment with a not readable stream. "
                + "Make sure that the specified stream is readable and was not disposed.");
        }
    }
}
