import {QueryToken} from "./QueryToken";
import {TypeUtil} from "../../../../Utility/TypeUtil";
import {NotSupportedException} from "../../../../Database/DatabaseExceptions";
import {QueryKeywords} from "../QueryLanguage";
import {StringBuilder} from "../../../../Utility/StringBuilder";

export class FromToken extends QueryToken {
  private _collectionName?: string;
  private _indexName?: string;
  private _isDynamic: boolean = false;

  private static readonly whiteSpaceChars: string[] = [
    ' ', '\t', '\r', '\n', '\v'
  ];

  public get collectionName(): string {
    return this._collectionName;
  }

  public get indexName(): string {
    return this._indexName;
  }

  public get isDynamic(): boolean {
    return this._isDynamic;
  }

  public static create(indexName?: string, collectionName?: string): FromToken {
    return new (this as typeof FromToken)(indexName, collectionName);
  }

  protected constructor(indexName?: string, collectionName?: string) {
    super();
    this._collectionName = collectionName;
    this._indexName = indexName;
    this._isDynamic = !TypeUtil.isNull(collectionName);
  }

  public writeTo(writer: StringBuilder): void {
    const wsChars: string[] = (this.constructor as (typeof FromToken))
      .whiteSpaceChars;

    if (!this._indexName && !this._collectionName) {
      throw new NotSupportedException("Either IndexName or CollectionName must be specified");
    }

    if (this._isDynamic) {
      writer
        .append(QueryKeywords.From)
        .append(' ');

      if (wsChars.some((char: string): boolean => this._collectionName.includes(char))) {

        if (this._collectionName.includes('"')) {
          throw new NotSupportedException(
            `Collection name cannot contain a quote, but was: ${this._collectionName}`
          );

        }

        writer.append('"').append(this._collectionName).append('"');
      }
    }

    writer
      .append(QueryKeywords.From)
      .append(' ')
      .append(QueryKeywords.Index)
      .append("'")
      .append(this._indexName)
      .append("'");
  }
}