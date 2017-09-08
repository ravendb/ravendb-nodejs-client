import {SimpleQueryToken} from './QueryToken';
import {QueryKeywords} from "../QueryLanguage";

export class DistinctToken extends SimpleQueryToken {
  protected tokenText(): string {
    return QueryKeywords.Distinct;
  }
}