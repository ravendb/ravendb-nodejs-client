import {IStringable} from '../../../../Typedef/Contracts';
import {StringBuilder} from "../../../../Utility/StringBuilder";

export interface IRQLToken extends IStringable {
  toString(): string;
}

export abstract class AbstractToken implements IRQLToken
{
  public static get instance(): IRQLToken {
    return new (this as (typeof AbstractToken));
  }

  public writeTo(writer: StringBuilder): void {
    writer.append(this.toString());
  }

  public abstract toString(): string;
}