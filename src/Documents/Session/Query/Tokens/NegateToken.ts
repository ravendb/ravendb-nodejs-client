import {SimpleQueryToken} from "./QueryToken";
import {QueryOperators} from "../QueryLanguage";

export class NegateToken extends SimpleQueryToken
{
  protected tokenText(): string {
    return QueryOperators.Not;
  }
}