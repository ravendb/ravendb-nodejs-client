import { ICommandData, CommandType } from "../CommandData";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../..";

export class DeleteAttachmentCommandData implements ICommandData {
    public id: string;
    public name: string;
    public changeVector: string;
    public type: CommandType = "AttachmentDELETE";

    public constructor(documentId: string, name: string, changeVector: string) {
        if (StringUtil.isWhitespace(documentId)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null");
        }

        if (StringUtil.isWhitespace(name)) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this.id = documentId;
        this.name = name;
        this.changeVector = changeVector;
    }

    public serialize(conventions: DocumentConventions): object {
        return {
            Id: this.id,
            Name: this.name,
            ChangeVector: this.changeVector,
            Type: "AttachmentDELETE" as CommandType
        };
    }
}
