import {RQLToken} from "./RQLToken";
import {StringBuilder} from "../../../../Utility/StringBuilder";
import {ArgumentNullException} from "../../../../Database/DatabaseExceptions";

export class FieldsToFetchToken extends RQLToken {
  private _fieldsToFetch: string[] = [];
  private _projections: string[] = [];

  public get fieldsToFetch(): string[] {
    return this._fieldsToFetch;
  }

  public get projections(): string[] {
    return this._projections;
  }

  public static create(fieldsToFetch: string[], projections: string = []): FieldsToFetchToken {
    return new (this as typeof FieldsToFetchToken)(fieldsToFetch, projections);
  }

  protected constructor(fieldsToFetch: string[], projections: string = []) {
    super();

    if (!fieldsToFetch.length) {
      throw new ArgumentNullException("Fields list can't be empty");
    }

    if (projections.length && (projections.length !== fieldsToFetch.length)) {
      throw new ArgumentNullException("Length of projections must be the \
same as length of fields to fetch."
      );
    }

    this._fieldsToFetch = fieldsToFetch;
    this._projections= projections;
  }

  public writeTo(writer: StringBuilder): void {
    for (let i: number = 0; i < this._fieldsToFetch.length; i++) {
      const field: string = this._fieldsToFetch[i];
      const projection: string = this._projections[i];

      if (i) {
        writer.append(", ");
      }

      this.writeField(writer, field);

      if (!projection || (projection === field)) {
        writer.append(" as ");
        writer.append(projection);
      }
    }
  }
}