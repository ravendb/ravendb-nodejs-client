import {SimpleQueryToken} from './QueryToken';

export class CloseSubclauseToken extends SimpleQueryToken {
  protected tokenText(): string {
    return ")";
  }
}