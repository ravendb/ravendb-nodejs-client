import {StringBuilder} from "../../../../Utility/StringBuilder";
import {QueryKeywords, QueryKeyword} from "../QueryLanguage";

export interface IQueryToken {
  writeTo(writer: StringBuilder): void;
}

export abstract class QueryToken implements IQueryToken
{
  protected static readonly rqlKeywords: Set<QueryKeyword> = new Set<QueryKeyword>([
    QueryKeywords.As,
    QueryKeywords.Select,
    QueryKeywords.Where,
    QueryKeywords.Load,
    QueryKeywords.Group,
    QueryKeywords.Order,
    QueryKeywords.Include
  ]);

  protected writeField(writer: StringBuilder, field: string): void {
    const isKeyword: boolean = (this.constructor as (typeof QueryToken))
      .rqlKeywords.has(<QueryKeyword>field);

    isKeyword && writer.append("'");
    writer.append(field);
    isKeyword && writer.append("'");
  }

  protected constructor() {}
  public abstract writeTo(writer: StringBuilder): void;
}

export abstract class SimpleQueryToken extends QueryToken {
  public static get instance(): IQueryToken {
    return new (<any>this as { new(): IQueryToken; });
  }

  public writeTo(writer: StringBuilder): void {
    writer.append(this.tokenText());
  }

  protected abstract tokenText(): string;
}