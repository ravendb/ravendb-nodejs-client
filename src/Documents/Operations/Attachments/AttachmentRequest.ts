import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";

export class AttachmentRequest {
    private readonly _name: string;
    private readonly _documentId: string;

    public constructor(documentId: string, name: string) {
        if (StringUtil.isNullOrWhitespace(documentId)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null or whitespace");
        }

        if (StringUtil.isNullOrWhitespace(name)) {
            throwError("InvalidArgumentException", "Name cannot be null or whitespace");
        }

        this._documentId = documentId;
        this._name = name;
    }

    public get name() {
        return this._name;
    }

    public get documentId() {
        return this._documentId;
    }
}
