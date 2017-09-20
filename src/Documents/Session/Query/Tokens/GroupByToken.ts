import {QueryToken} from "./QueryToken";
import {StringBuilder} from "../../../../Utility/StringBuilder";

export class GroupByToken extends QueryToken {
  private _fieldName: string;

  public static create(fieldName: string): GroupByToken {
    return new (this as (typeof GroupByToken))(fieldName);
  }

  public constructor(fieldName: string) { //TODO change to protected
    super();
    this._fieldName = fieldName;
  }

  public writeTo(writer: StringBuilder): void {
    this.writeField(writer, this._fieldName);
  }
}