import {QueryToken} from "./QueryToken";
import {QueryKeywords} from "../QueryLanguage";
import {StringBuilder} from "../../../../Utility/StringBuilder";

export class GroupByKeyToken extends QueryToken {
  private _fieldName: string;
  private _projectedName?: string;

  public static create(fieldName: string, projectedName?: string): GroupByKeyToken {
    return new (this as (typeof GroupByKeyToken))(fieldName, projectedName);
  }

  protected constructor(fieldName: string, projectedName?: string) {
    super();
    this._fieldName = fieldName;
    this._projectedName = projectedName;
  }

  public writeTo(writer: StringBuilder): void {
    this.writeField(writer, this._fieldName || "key()");

    if (!this._projectedName || (this._projectedName === this._fieldName)) {
      return;
    }

    writer
      .append(" ")
      .append(QueryKeywords.As)
      .append(" ")
      .append(this._projectedName);
  }
}