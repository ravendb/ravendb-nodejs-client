import {QueryToken} from "./QueryToken";
import {QueryKeywords} from "../QueryLanguage";
import {ArgumentNullException} from "../../../../Database/DatabaseExceptions";
import {StringBuilder} from "../../../../Utility/StringBuilder";

export class GroupBySumToken extends QueryToken {
  private _fieldName: string;
  private _projectedName?: string;

  public static create(fieldName: string, projectedName?: string): GroupBySumToken {
    return new (this as (typeof GroupBySumToken))(fieldName, projectedName);
  }

  protected constructor(fieldName: string, projectedName?: string) {
    super();

    if (!fieldName) {
      throw new ArgumentNullException("Field name can't be null");
    }

    this._fieldName = fieldName;
    this._projectedName = projectedName;
  }

  public writeTo(writer: StringBuilder): void {
    writer
      .append("sum(")
      .append(this._fieldName)
      .append(")");

    if (!this._projectedName) {
      return;
    }

    writer
      .append(" ")
      .append(QueryKeywords.As)
      .append(" ")
      .append(this._projectedName);
  }
}