import { throwError } from "../../../Exceptions";

export class PutAttachmentCommandHelper {
    public static throwStreamWasAlreadyUsed(): void {
        throwError("InvalidOperationException",
            "It is forbidden to re-use the same InputStream for more than one attachment. "
            + "Use a unique InputStream per put attachment command.");
    }
}
