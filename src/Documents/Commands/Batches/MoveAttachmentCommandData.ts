import { ICommandData, CommandType } from "../CommandData";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";

export class MoveAttachmentCommandData implements ICommandData {
    public id: string;
    public changeVector: string;
    public name: string;
    private _destinationId: string;
    private _destinationName: string;

    public get type(): CommandType {
        return "AttachmentMOVE";
    }

    public constructor(
        documentId: string, 
        name: string, 
        destinationDocumentId: string, 
        destinationName: string, 
        changeVector: string) {
        if (StringUtil.isNullOrWhitespace(documentId)) {
            throwError("InvalidArgumentException", "DocumentId is required.");
        }

        if (StringUtil.isNullOrWhitespace(name)) {
            throwError("InvalidArgumentException", "Name is required.");
        }

        if (StringUtil.isNullOrWhitespace(destinationDocumentId)) {
            throwError("InvalidArgumentException", "DestinationDocumentId is required.");
        }

        if (StringUtil.isNullOrWhitespace(destinationName)) {
            throwError("InvalidArgumentException", "DestinationName is required.");
        }
        
        this.id = documentId;
        this.name = name;
        this.changeVector = changeVector;
        this._destinationId = destinationDocumentId;
        this._destinationName = destinationName;
    }

    public getType(): CommandType {
        return "AttachmentMOVE";
    }

    public serialize(conventions: DocumentConventions): object {
        return {
            Id: this.id,
            Name: this.name,
            DestinationId: this._destinationId,
            DestinationName: this._destinationName,
            ChangeVector: this.changeVector,
            Type: "AttachmentMOVE" as CommandType
        };
    }
}
