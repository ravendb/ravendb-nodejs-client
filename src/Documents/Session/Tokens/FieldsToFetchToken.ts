import { QueryToken } from "./QueryToken";
import { throwError } from "../../../Exceptions";

export class FieldsToFetchToken extends QueryToken {

    public fieldsToFetch: string[];
    public projections: string[];
    public customFunction: boolean;
    public sourceAlias: string;

    private constructor(fieldsToFetch: string[], projections: string[], customFunction: boolean, sourceAlias: string) {
        super();
        this.fieldsToFetch = fieldsToFetch;
        this.projections = projections;
        this.customFunction = customFunction;
        this.sourceAlias = sourceAlias;
    }

    public static create(fieldsToFetch: string[],
                         projections: string[], customFunction: boolean): FieldsToFetchToken;
    public static create(fieldsToFetch: string[],
                         projections: string[], customFunction: boolean, sourceAlias: string): FieldsToFetchToken;
    public static create(fieldsToFetch: string[],
                         projections: string[], customFunction: boolean, sourceAlias?: string): FieldsToFetchToken {
        if (!fieldsToFetch || !fieldsToFetch.length) {
            throwError("InvalidArgumentException", "fieldToFetch cannot be null");
        }

        if (!customFunction && projections && projections.length !== fieldsToFetch.length) {
            throwError("InvalidArgumentException",
                "Length of projections must be the same as length of field to fetch");
        }

        return new FieldsToFetchToken(fieldsToFetch, projections, customFunction, sourceAlias);
    }

    public writeTo(writer): void {
        for (let i = 0; i < this.fieldsToFetch.length; i++) {
            const fieldToFetch = this.fieldsToFetch[i];

            if (i > 0) {
                writer.append(", ");
            }

            if (!fieldToFetch) {
                writer.append("null");
            } else {
                QueryToken.writeField(writer, fieldToFetch);
            }

            if (this.customFunction) {
                continue;
            }

            const projection: string = this.projections ? this.projections[i] : null;

            if (!projection || projection === fieldToFetch) {
                continue;
            }

            writer.append(" as ");
            writer.append(projection);
        }
    }
}
