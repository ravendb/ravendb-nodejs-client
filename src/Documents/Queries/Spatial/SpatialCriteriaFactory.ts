import { SpatialCriteria } from "./SpatialCriteria";
import { SpatialRelation, SpatialUnits } from "../../Indexes/Spatial";
import { CONSTANTS } from "../../../Constants";
import { WktCriteria } from "./WktCriteria";
import { CircleCriteria } from "./CircleCriteria";
import { TypeUtil } from "../../../Utility/TypeUtil";

export class SpatialCriteriaFactory {

    public static INSTANCE = new SpatialCriteriaFactory();

    private constructor() {
    }

    public relatesToShape(shapeWkt: string, relation: SpatialRelation): SpatialCriteria;
    public relatesToShape(
        shapeWkt: string, 
        relation: SpatialRelation, 
        units: SpatialUnits, 
        distErrorPercent: number): SpatialCriteria;
    public relatesToShape(
        shapeWkt: string, 
        relation: SpatialRelation, 
        units?: SpatialUnits, 
        distErrorPercent?: number): SpatialCriteria {
        if (!distErrorPercent) {
            distErrorPercent = CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT;
        }

        return new WktCriteria(shapeWkt, relation, units, distErrorPercent);
    }

    private static _normalizeArgs(distErrorPercentOrUnits, distErrorPercent) {
        let units = null;
        if (TypeUtil.isString(distErrorPercentOrUnits)) {
            units = distErrorPercentOrUnits;
        } else if (TypeUtil.isNumber(distErrorPercentOrUnits)) {
            distErrorPercent = distErrorPercentOrUnits;
            units = null;
        }

        distErrorPercent = distErrorPercent || CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT;
        return { units, distErrorPercent };
    }

    public intersects(shapeWkt: string): SpatialCriteria;
    public intersects(
        shapeWkt: string, 
        distErrorPercent: number): SpatialCriteria;
    public intersects(
        shapeWkt: string, 
        distErrorPercent: number): SpatialCriteria;
    public intersects(
        shapeWkt: string, 
        units: SpatialUnits,
        distErrorPercent: number): SpatialCriteria;
    public intersects(
        shapeWkt: string, 
        distErrorPercentOrUnits?: number | SpatialUnits,
        distErrorPercent?: number): SpatialCriteria {
        const args = 
            SpatialCriteriaFactory._normalizeArgs(distErrorPercentOrUnits, distErrorPercent);
        return this.relatesToShape(shapeWkt, "Intersects", args.units, args.distErrorPercent);
    }

    public contains(shapeWkt: string): SpatialCriteria;
    public contains(shapeWkt: string, units: SpatialUnits): SpatialCriteria;
    public contains(shapeWkt: string, distErrorPercent: number): SpatialCriteria;
    public contains(shapeWkt: string, units: SpatialUnits, distErrorPercent: number): SpatialCriteria;
    public contains(
        shapeWkt: string, 
        distErrorPercentOrUnits?: number | SpatialUnits, 
        distErrorPercent?: number): SpatialCriteria {
        const args = 
            SpatialCriteriaFactory._normalizeArgs(distErrorPercentOrUnits, distErrorPercent);
        return this.relatesToShape(shapeWkt, "Contains", args.units, args.distErrorPercent);
    }

    public disjoint(shapeWkt: string): SpatialCriteria;
    public disjoint(shapeWkt: string, units: SpatialUnits): SpatialCriteria;
    public disjoint(shapeWkt: string, distErrorPercent: number): SpatialCriteria;
    public disjoint(shapeWkt: string, units: SpatialUnits, distErrorPercent: number): SpatialCriteria;
    public disjoint(
        shapeWkt: string, 
        distErrorPercentOrUnits?: number | SpatialUnits,
        distErrorPercent?: number): SpatialCriteria {
        const args = 
            SpatialCriteriaFactory._normalizeArgs(distErrorPercentOrUnits, distErrorPercent);
        return this.relatesToShape(shapeWkt, "Disjoint", args.units, args.distErrorPercent);
    }

    public within(shapeWkt: string): SpatialCriteria;
    public within(shapeWkt: string, units: SpatialUnits): SpatialCriteria;
    public within(shapeWkt: string, distErrorPercent: number): SpatialCriteria;
    public within(shapeWkt: string, units: SpatialUnits, distErrorPercent: number): SpatialCriteria;
    public within(
        shapeWkt: string, 
        distErrorPercentOrUnits?: number | SpatialUnits,
        distErrorPercent?: number): SpatialCriteria {
        const args = 
            SpatialCriteriaFactory._normalizeArgs(distErrorPercentOrUnits, distErrorPercent);
        return this.relatesToShape(shapeWkt, "Within", args.units, args.distErrorPercent);
    }

    public withinRadius(radius: number, latitude: number, longitude: number): SpatialCriteria;
    public withinRadius(
        radius: number, latitude: number, longitude: number, radiusUnits: SpatialUnits): SpatialCriteria;
    public withinRadius(
        radius: number,
        latitude: number,
        longitude: number,
        radiusUnits: SpatialUnits,
        distErrorPercent: number): SpatialCriteria;
    public withinRadius(
        radius: number,
        latitude: number,
        longitude: number,
        radiusUnits: SpatialUnits = null,
        distErrorPercent?: number): SpatialCriteria {
        distErrorPercent = distErrorPercent || CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT;
        return new CircleCriteria(radius, latitude, longitude, radiusUnits, "Within", distErrorPercent);
    }
}
