import {QueryToken} from "./QueryToken";
import {StringBuilder} from "../../../../Utility/StringBuilder";
import {QueryOperator, QueryOperators} from "../QueryLanguage";

export class QueryOperatorToken extends QueryToken {
  private _queryOperator: QueryOperator;

  public static get And(): QueryToken {
    return new (this as (typeof QueryOperatorToken))(QueryOperators.And);
  }

  public static get Or(): QueryToken {
    return new (this as (typeof QueryOperatorToken))(QueryOperators.Or);
  }

  protected constructor(queryOperator: QueryOperator) {
    super();
    this._queryOperator = queryOperator;
  }

  public writeTo(writer: StringBuilder): void {
    writer.append(this._queryOperator);
  }
}