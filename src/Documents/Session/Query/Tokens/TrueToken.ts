import {SimpleQueryToken} from "./QueryToken";

export class TrueToken extends SimpleQueryToken
{
  protected tokenText(): string {
    return true.toString();
  }
}