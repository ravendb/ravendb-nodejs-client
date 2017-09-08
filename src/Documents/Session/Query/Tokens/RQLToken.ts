import {StringBuilder} from "../../../../Utility/StringBuilder";

export interface IRQLToken {
  writeTo(writer: StringBuilder): void;
}

export abstract class RQLToken implements IRQLToken
{
  protected static readonly rqlKeywords = new Set([
    "AS",
    "SELECT",
    "WHERE",
    "LOAD",
    "GROUP",
    "ORDER",
    "INCLUDE"
  ]);

  protected writeField(writer: StringBuilder, field: string): void {
    const isKeyword: boolean = (this.constructor as (typeof RQLToken))
      .rqlKeywords.has(field);

    isKeyword && writer.append("'");
    writer.append(field);
    isKeyword && writer.append("'");
  }

  protected constructor() {}
  public abstract writeTo(writer: StringBuilder): void;
}

export abstract class SimpleRQLToken extends RQLToken {
  public static get instance(): IRQLToken {
    return new (this as (typeof SimpleRQLToken));
  }

  protected abstract tokenText(): string;
}