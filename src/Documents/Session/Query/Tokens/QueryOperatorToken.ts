import {QueryToken} from "./QueryToken";
import {StringBuilder} from "../../../../Utility/StringBuilder";
import {QueryOperator, QueryOperators} from "../QueryLanguage";

export class QueryOperatorToken extends QueryToken {
  private _queryOperator: QueryOperator;

  public static get And(): QueryToken {
    return new (this as (typeof QueryToken))(QueryOperators.AND);
  }

  public static get Or(): QueryToken {
    return new (this as (typeof QueryToken))(QueryOperators.OR);
  }

  protected constructor(queryOperator: QueryOperator) {
    super();
    this._queryOperator = queryOperator;
  }

  public writeTo(writer: StringBuilder): void {
    writer.append(this._queryOperator);
  }
}