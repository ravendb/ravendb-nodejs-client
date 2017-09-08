import {AbstractToken} from './AbstractToken';

export class CloseSubclauseToken extends AbstractToken {
  public toString(): string {
    return ")";
  }
}