import { CommandType, ICommandData } from "../CommandData";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { DocumentConventions, InMemoryDocumentSessionOperations } from "../../..";

export class CopyTimeSeriesCommandData implements ICommandData {
    public readonly id: string;
    public readonly name: string;
    public changeVector: string;
    public readonly destinationId: string;
    public readonly destinationName: string;

    public get type(): CommandType {
        return "TimeSeriesCopy";
    }

    public constructor(sourceDocumentId: string, sourceName: string, destinationDocumentId: string, destinationName: string) {
        if (StringUtil.isNullOrWhitespace(sourceDocumentId)) {
            throwError("InvalidArgumentException", "SourceDocumentId cannot be null or whitespace.");
        }
        if (StringUtil.isNullOrWhitespace(sourceName)) {
            throwError("InvalidArgumentException", "SourceName cannot be null or whitespace.");
        }
        if (StringUtil.isNullOrWhitespace(destinationDocumentId)) {
            throwError("InvalidArgumentException", "DestinationDocumentId cannot be null or whitespace.");
        }
        if (StringUtil.isNullOrWhitespace(destinationName)) {
            throwError("InvalidArgumentException", "DestinationName cannot be null or whitespace.");
        }

        this.id = sourceDocumentId;
        this.name = sourceName;
        this.destinationId = destinationDocumentId;
        this.destinationName = destinationName;
    }

    serialize(conventions: DocumentConventions): object {
        return {
            Id: this.id,
            Name: this.name,
            DestinationId: this.destinationId,
            DestinationName: this.destinationName,
            Type: "TimeSeriesCopy"
        }
    }

    onBeforeSaveChanges(session: InMemoryDocumentSessionOperations) {
        // empty
    }
}