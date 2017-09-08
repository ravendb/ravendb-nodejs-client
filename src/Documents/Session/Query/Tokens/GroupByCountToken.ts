import {QueryToken} from "./QueryToken";
import {QueryKeywords} from "../QueryLanguage";
import {StringBuilder} from "../../../../Utility/StringBuilder";

export class GroupByCountToken extends QueryToken {
  private _fieldName: string;

  public static create(fieldName: string): GroupByCountToken {
    return new (this as (typeof GroupByCountToken))(fieldName);
  }

  protected constructor(fieldName: string) {
    super();
    this._fieldName = fieldName;
  }

  public writeTo(writer: StringBuilder): void {
    writer
      .append("count()");

    if (!this._fieldName) {
      return;
    }

    writer
      .append(" ")
      .append(QueryKeywords.As)
      .append(" ")
      .append(this._fieldName);
  }
}