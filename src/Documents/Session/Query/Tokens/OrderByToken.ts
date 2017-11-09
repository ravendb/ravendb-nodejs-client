import {QueryToken} from "./QueryToken";
import {OrderingType, OrderingTypes, QueryKeywords} from "../QueryLanguage";
import {StringBuilder} from "../../../../Utility/StringBuilder";
import {ArgumentNullException} from "../../../../Database/DatabaseExceptions";

export class OrderByToken extends QueryToken
{
  private _fieldName: string;
  private _descending: boolean;
  private _ordering: OrderingType;

  public static get random(): OrderByToken {
    return new (this as (typeof OrderByToken))("random()");
  }

  public static get scoreAscending(): OrderByToken {
    return new (this as (typeof OrderByToken))("score()");
  }

  public static get scoreDescending(): OrderByToken {
    return new (this as (typeof OrderByToken))("score()", true);
  }

  protected constructor(fieldName: string, descending: boolean = false, ordering: OrderingType = OrderingTypes.String)
  {
    super();
    this._fieldName = fieldName;
    this._descending = descending;
    this._ordering = ordering;
  }

  public static createDistanceAscending(fieldName: string, shapeWktParameterName: string): OrderByToken;
  public static createDistanceAscending(fieldName: string, latitudeParameterName: string, longitudeParameterName: string): OrderByToken;
  public static createDistanceAscending(fieldName: string, latitudeOrShapeWktParameterName: string, longitudeParameterName?: string): OrderByToken
  {
    const expression: string = longitudeParameterName
      ? `distance(${fieldName}, point($${latitudeOrShapeWktParameterName}, $${longitudeParameterName}))`
      : `distance(${fieldName}, wkt($${latitudeOrShapeWktParameterName}))`;

    return new (this as (typeof OrderByToken))(expression);
  }

  public static createDistanceDescending(fieldName: string, shapeWktParameterName: string): OrderByToken;
  public static createDistanceDescending(fieldName: string, latitudeParameterName: string, longitudeParameterName: string): OrderByToken;
  public static createDistanceDescending(fieldName: string, latitudeOrShapeWktParameterName: string, longitudeParameterName?: string): OrderByToken
  {
    const expression: string = longitudeParameterName
      ? `distance(${fieldName}, point($${latitudeOrShapeWktParameterName}, $${longitudeParameterName}))`
      : `distance(${fieldName}, wkt($${latitudeOrShapeWktParameterName}))`;

    return new (this as (typeof OrderByToken))(expression, true);
  }

  public static createRandom(seed: string): OrderByToken
  {
    if (!seed == null) {
      throw new ArgumentNullException("Seed can't be null");
    }

    return new (this as (typeof OrderByToken))(`random('${seed.replace(/'/g, "''")}')`);
  }

  public static createAscending(fieldName: string, ordering: OrderingType): OrderByToken
  {
    return new (this as (typeof OrderByToken))(fieldName, false, ordering);
  }

  public static createDescending(fieldName: string, ordering: OrderingType): OrderByToken
  {
    return new (this as (typeof OrderByToken))(fieldName, true, ordering);
  }

  public writeTo(writer: StringBuilder): void
  {
    this.writeField(writer, this._fieldName);

    if (OrderingTypes.String !== this._ordering) {
      writer
        .append(" ")
        .append(QueryKeywords.As)
        .append(" ")
        .append(this._ordering);
    }

    if (this._descending) {
      writer
        .append(" ")
        .append(QueryKeywords.Desc);
    }
  }
}
