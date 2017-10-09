import {SimpleQueryToken} from "./QueryToken";

export class IntersectMarkerToken extends SimpleQueryToken
{
  protected tokenText(): string {
    return ",";
  }
}