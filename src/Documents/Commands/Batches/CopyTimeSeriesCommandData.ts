import { CommandType, ICommandData } from "../CommandData";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations";
import { DateUtil } from "../../../Utility/DateUtil";

export class CopyTimeSeriesCommandData implements ICommandData {
    public readonly id: string;
    public readonly name: string;
    public changeVector: string;
    public readonly destinationId: string;
    public readonly destinationName: string;
    public readonly from?: Date;
    public readonly to?: Date;

    public get type(): CommandType {
        return "TimeSeriesCopy";
    }

    public constructor(sourceDocumentId: string, sourceName: string, destinationDocumentId: string, destinationName: string,
                       from?: Date, to?: Date) {
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
        this.from = from;
        this.to = to;
    }

    serialize(conventions: DocumentConventions): object {
        return {
            Id: this.id,
            Name: this.name,
            DestinationId: this.destinationId,
            DestinationName: this.destinationName,
            From: this.from ? DateUtil.utc.stringify(this.from) : null,
            To: this.to ? DateUtil.utc.stringify(this.to) : null,
            Type: "TimeSeriesCopy"
        }
    }

    onBeforeSaveChanges(session: InMemoryDocumentSessionOperations) {
        // empty
    }
}