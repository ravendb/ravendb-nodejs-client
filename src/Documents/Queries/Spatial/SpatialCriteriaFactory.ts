import {SpatialCriteria} from "./SpatialCriteria";
import {SpatialRelation, SpatialUnits} from "../../Indexes/Spatial";
import {CONSTANTS} from "../../../Constants";
import {WktCriteria} from "./WktCriteria";
import {CircleCriteria} from "./CircleCriteria";

export class SpatialCriteriaFactory {

    public static INSTANCE = new SpatialCriteriaFactory();

    private constructor() {
    }

    public relatesToShape(shapeWkt: string, relation: SpatialRelation): SpatialCriteria;
    public relatesToShape(shapeWkt: string, relation: SpatialRelation, distErrorPercent: number): SpatialCriteria;
    public relatesToShape(shapeWkt: string, relation: SpatialRelation, distErrorPercent?: number): SpatialCriteria {
        if (!distErrorPercent) {
            distErrorPercent = CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT;
        }

        return new WktCriteria(shapeWkt, relation, distErrorPercent);
    }

    public intersects(shapeWkt: string): SpatialCriteria;
    public intersects(shapeWkt: string, distErrorPercent: number): SpatialCriteria;
    public intersects(shapeWkt: string, distErrorPercent?: number): SpatialCriteria {
        if (!distErrorPercent) {
            distErrorPercent = CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT;
        }
        return this.relatesToShape(shapeWkt, "Intersects", distErrorPercent);
    }

    public contains(shapeWkt: string): SpatialCriteria;
    public contains(shapeWkt: string, distErrorPercent: number): SpatialCriteria;
    public contains(shapeWkt: string, distErrorPercent?: number): SpatialCriteria {
        distErrorPercent = distErrorPercent || CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT;
        return this.relatesToShape(shapeWkt, "Contains", distErrorPercent);
    }

    public disjoint(shapeWkt: string): SpatialCriteria;
    public disjoint(shapeWkt: string, distErrorPercent: number): SpatialCriteria;
    public disjoint(shapeWkt: string, distErrorPercent?: number): SpatialCriteria {
        distErrorPercent = distErrorPercent || CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT;
        return this.relatesToShape(shapeWkt, "Disjoint", distErrorPercent);
    }

    public within(shapeWkt: string): SpatialCriteria;
    public within(shapeWkt: string, distErrorPercent: number): SpatialCriteria;
    public within(shapeWkt: string, distErrorPercent?: number): SpatialCriteria {
        distErrorPercent = distErrorPercent || CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT;
        return this.relatesToShape(shapeWkt, "Within", distErrorPercent);
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
