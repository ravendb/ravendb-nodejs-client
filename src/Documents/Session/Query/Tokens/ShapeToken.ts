import {QueryToken} from "./QueryToken";
import {StringBuilder} from "../../../../Utility/StringBuilder";
import {ConditionValueUnit} from "../QueryLanguage";

export class ShapeToken extends QueryToken
{
  private _shape: string;

  protected constructor(shape: string)
  {
    super();
    this._shape = shape;
  }

  public static circle(radiusParameterName: string, latituteParameterName: string, longitudeParameterName: string, radiusUnits?: ConditionValueUnit)
  {
    const tokenCtor: typeof ShapeToken = this as (typeof ShapeToken);

    if (!radiusUnits) {
      return new tokenCtor(`circle($${radiusParameterName}, $${latituteParameterName}, $${longitudeParameterName})`);
    }

    return new tokenCtor(`circle($${radiusParameterName}, $${latituteParameterName}, $${longitudeParameterName}, '${radiusUnits}')`);
  }

  public static wkt(shapeWktParameterName: string): ShapeToken
  {
    return new (this as (typeof ShapeToken))(`wkt($${shapeWktParameterName})`);
  }

  public writeTo(writer: StringBuilder): void
  {
    writer.append(this._shape);
  }
}