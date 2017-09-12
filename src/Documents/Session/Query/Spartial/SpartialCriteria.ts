import {SpartialRelation, SpartialRelations} from "./SpartialRelation";
import {QueryToken} from "../Tokens/QueryToken";
import {ShapeToken} from "../Tokens/ShapeToken";
import {WhereToken} from "../Tokens/WhereToken";
import {SpartialConstants} from "./SpartialConstants";
import {WktCriteria} from "./WktCriteria";
import {SpartialUnit} from "./SpartialUnit";
import {CircleCriteria} from "./CircleCriteria";

export abstract class SpartialCriteria {
  protected relation: SpartialRelation;
  protected distanceErrorPct: number;

  public static relatesToShape(shapeWkt: string, relation: SpartialRelation, distErrorPercent: number = SpartialConstants.DefaultDistanceErrorPct)
  {
    return new WktCriteria(shapeWkt, relation, distErrorPercent);
  }
  
  public static intersects(shapeWkt: string, distErrorPercent: number = SpartialConstants.DefaultDistanceErrorPct): SpartialCriteria
  {
    return (<typeof SpartialCriteria>this).relatesToShape(shapeWkt, SpartialRelations.Intersects, distErrorPercent);
  }
  
  public static contains(shapeWkt: string, distErrorPercent: number = SpartialConstants.DefaultDistanceErrorPct): SpartialCriteria
  {
    return (<typeof SpartialCriteria>this).relatesToShape(shapeWkt, SpartialRelations.Contains, distErrorPercent);
  }
  
  public static disjoint(shapeWkt: string, distErrorPercent: number = SpartialConstants.DefaultDistanceErrorPct)
  {
    return (<typeof SpartialCriteria>this).relatesToShape(shapeWkt, SpartialRelations.Disjoint, distErrorPercent);
  }
  
  public static within(shapeWkt: string, distErrorPercent: number = SpartialConstants.DefaultDistanceErrorPct)
  {
    return (<typeof SpartialCriteria>this).relatesToShape(shapeWkt, SpartialRelations.Within, distErrorPercent);
  }
  
  public static withinRadius(radius: number, latitude: number, longitude: number, radiusUnits?: SpartialUnit, distErrorPercent: number = SpartialConstants.DefaultDistanceErrorPct)
  {
    return new CircleCriteria(radius, latitude, longitude, radiusUnits, SpartialRelations.Within, distErrorPercent);
  }

  constructor(relation: SpartialRelation, distanceErrorPct: number) {
    this.relation = relation;
    this.distanceErrorPct = distanceErrorPct;
  }

  public abstract getShapeToken(addQueryParameter:  (parameterValue: string | number) => string): ShapeToken;

  public toQueryToken(fieldName: string, addQueryParameter:  (parameterValue: string | number) => string): QueryToken {
    let relationToken: QueryToken;
    const shapeToken: ShapeToken = this.getShapeToken(addQueryParameter);

    switch (this.relation) {
      case SpartialRelations.Intersects:
        relationToken = WhereToken.intersects(fieldName, shapeToken, this.distanceErrorPct);
        break;
      case SpartialRelations.Contains:
        relationToken = WhereToken.contains(fieldName, shapeToken, this.distanceErrorPct);
        break;
      case SpartialRelations.Within:
        relationToken = WhereToken.within(fieldName, shapeToken, this.distanceErrorPct);
        break;
      case SpartialRelations.Disjoint:
        relationToken = WhereToken.disjoint(fieldName, shapeToken, this.distanceErrorPct);
        break;
    }

    return relationToken;
  }
}