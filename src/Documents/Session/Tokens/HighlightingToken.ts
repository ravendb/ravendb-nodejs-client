import { QueryToken } from "./QueryToken";
import * as StringBuilder from "string-builder";

export class HighlightingToken extends QueryToken {
    private readonly _fieldName: string;
    private readonly _fragmentLength: number;
    private readonly _fragmentCount: number;
    private readonly _optionsParameterName: string;

    private constructor(
        fieldName: string, fragmentLength: number, fragmentCount: number, operationsParameterName: string) {
        super();
        this._fieldName = fieldName;
        this._fragmentLength = fragmentLength;
        this._fragmentCount = fragmentCount;
        this._optionsParameterName = operationsParameterName;
    }

    public static create(
        fieldName: string, 
        fragmentLength: number, 
        fragmentCount: number,
        optionsParameterName: string): HighlightingToken {
        return new HighlightingToken(fieldName, fragmentLength, fragmentCount, optionsParameterName);
    }

    public writeTo(writer: StringBuilder): void {
        writer.append("highlight(");
        this._writeField(writer, this._fieldName);
        writer
            .append(",")
            .append(this._fragmentLength)
            .append(",")
            .append(this._fragmentCount);
        if (this._optionsParameterName) {
            writer
                .append(",$")
                .append(this._optionsParameterName);
        }

        writer.append(")");
    }
}
