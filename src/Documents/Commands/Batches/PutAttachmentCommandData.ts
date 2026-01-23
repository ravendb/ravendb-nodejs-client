import { ICommandData, CommandType } from "../CommandData.js";
import { AttachmentData } from "../../Attachments/index.js";
import { RemoteAttachmentParameters } from "../../Operations/Attachments/RemoteAttachmentParameters.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { throwError } from "../../../Exceptions/index.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";

export class PutAttachmentCommandData implements ICommandData {
    public id: string;
    public name: string;
    public changeVector: string;
    public type: CommandType = "AttachmentPUT";
    public contentType: string;
    public attStream: AttachmentData;
    public remoteParameters?: RemoteAttachmentParameters;

    public constructor(
        documentId: string,
        name: string,
        stream: AttachmentData,
        contentType: string,
        changeVector: string,
        remoteParameters?: RemoteAttachmentParameters) {

        if (StringUtil.isNullOrWhitespace(documentId)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null.");
        }

        if (StringUtil.isNullOrWhitespace(name)) {
            throwError("InvalidArgumentException", "Name cannot be null.");
        }

        this.id = documentId;
        this.name = name;
        this.attStream = stream;
        this.contentType = contentType;
        this.changeVector = changeVector;
        this.remoteParameters = remoteParameters;
    }

    public serialize(conventions: DocumentConventions): object {
        const result: AttachmentData = {
            Id: this.id,
            Name: this.name,
            ChangeVector: this.changeVector,
            Type: "AttachmentPUT" as CommandType,
            ContentType: this.contentType
        };

        if (this.remoteParameters) {
            result.RemoteParameters = {
                Identifier: this.remoteParameters.identifier,
                Flags: this.remoteParameters.flags,
                At: this.remoteParameters.at?.toISOString()
            };
        }

        return result;
    }
}
