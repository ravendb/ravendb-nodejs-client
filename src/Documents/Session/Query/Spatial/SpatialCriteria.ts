import {SpatialRelation, SpatialRelations} from "./SpatialRelation";
import {QueryToken} from "../Tokens/QueryToken";
import {ShapeToken} from "../Tokens/ShapeToken";
import {WhereToken} from "../Tokens/WhereToken";
import {SpatialConstants} from "./SpatialConstants";
import {WktCriteria} from "./WktCriteria";
import {SpatialUnit} from "./SpatialUnit";
import {CircleCriteria} from "./CircleCriteria";

export type SpatialParameterNameGenerator = (parameterValue: string | number) => string;

export abstract class SpatialCriteria {
  protected relation: SpatialRelation;
  protected distanceErrorPct: number;

  public static relatesToShape(shapeWkt: string, relation: SpatialRelation, distErrorPercent: number = SpatialConstants.DefaultDistanceErrorPct)
  {
    return new WktCriteria(shapeWkt, relation, distErrorPercent);
  }

  public static intersects(shapeWkt: string, distErrorPercent: number = SpatialConstants.DefaultDistanceErrorPct): SpatialCriteria
  {
    return (<typeof SpatialCriteria>this).relatesToShape(shapeWkt, SpatialRelations.Intersects, distErrorPercent);
  }

  public static contains(shapeWkt: string, distErrorPercent: number = SpatialConstants.DefaultDistanceErrorPct): SpatialCriteria
  {
    return (<typeof SpatialCriteria>this).relatesToShape(shapeWkt, SpatialRelations.Contains, distErrorPercent);
  }

  public static disjoint(shapeWkt: string, distErrorPercent: number = SpatialConstants.DefaultDistanceErrorPct)
  {
    return (<typeof SpatialCriteria>this).relatesToShape(shapeWkt, SpatialRelations.Disjoint, distErrorPercent);
  }

  public static within(shapeWkt: string, distErrorPercent: number = SpatialConstants.DefaultDistanceErrorPct)
  {
    return (<typeof SpatialCriteria>this).relatesToShape(shapeWkt, SpatialRelations.Within, distErrorPercent);
  }

  public static withinRadius(radius: number, latitude: number, longitude: number, radiusUnits?: SpatialUnit, distErrorPercent: number = SpatialConstants.DefaultDistanceErrorPct)
  {
    return new CircleCriteria(radius, latitude, longitude, radiusUnits, SpatialRelations.Within, distErrorPercent);
  }

  constructor(relation: SpatialRelation, distanceErrorPct: number) {
    this.relation = relation;
    this.distanceErrorPct = distanceErrorPct;
  }

  public abstract getShapeToken(addQueryParameter: SpatialParameterNameGenerator): ShapeToken;

  public toQueryToken(fieldName: string, addQueryParameter: SpatialParameterNameGenerator): QueryToken {
    let relationToken: QueryToken;
    const shapeToken: ShapeToken = this.getShapeToken(addQueryParameter);

    switch (this.relation) {
      case SpatialRelations.Intersects:
        relationToken = WhereToken.intersects(fieldName, shapeToken, this.distanceErrorPct);
        break;
      case SpatialRelations.Contains:
        relationToken = WhereToken.contains(fieldName, shapeToken, this.distanceErrorPct);
        break;
      case SpatialRelations.Within:
        relationToken = WhereToken.within(fieldName, shapeToken, this.distanceErrorPct);
        break;
      case SpatialRelations.Disjoint:
        relationToken = WhereToken.disjoint(fieldName, shapeToken, this.distanceErrorPct);
        break;
    }

    return relationToken;
  }
}