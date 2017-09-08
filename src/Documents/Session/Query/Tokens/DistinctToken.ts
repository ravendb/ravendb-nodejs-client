import {SimpleRQLToken} from './RQLToken';

export class DistinctToken extends SimpleRQLToken {
  protected tokenText(): string {
    return "DISTINCT";
  }
}