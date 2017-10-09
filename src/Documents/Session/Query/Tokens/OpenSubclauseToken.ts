import {SimpleQueryToken} from './QueryToken';

export class OpenSubclauseToken extends SimpleQueryToken {
  protected tokenText(): string {
    return "(";
  }
}