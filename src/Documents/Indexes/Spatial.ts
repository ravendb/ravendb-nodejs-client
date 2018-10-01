import { throwError } from "../../Exceptions";

// about 4.78 meters at equator, should be good enough 
// (see: http://unterbahn.com/2009/11/metric-dimensions-of-geohash-partitions-at-the-equator/)
export const DEFAULT_GEOHASH_LEVEL = 9;

// about 4.78 meters at equator, should be good enough
export const DEFAULT_QUAD_TREE_LEVEL = 23;

export type SpatialFieldType = "Geography" | "Cartesian";

export type SpatialSearchStrategy =
    "GeohashPrefixTree"
    | "QuadPrefixTree"
    | "BoundingBox";

export type SpatialUnits = "Kilometers" | "Miles";

export class SpatialOptions {

    public type: SpatialFieldType;
    public strategy: SpatialSearchStrategy;
    public maxTreeLevel: number;
    public minX: number;
    public maxX: number;
    public minY: number;
    public maxY: number;

    // Circle radius units, only used for geography  indexes
    public units: SpatialUnits;

    public constructor(options?: SpatialOptions) {
        options = options || {} as SpatialOptions;
        this.type = options.type || "Geography";
        this.strategy = options.strategy || "GeohashPrefixTree";
        this.maxTreeLevel = options.maxTreeLevel || DEFAULT_GEOHASH_LEVEL;
        this.minX = options.minX || -180;
        this.maxX = options.maxX || 180;
        this.minY = options.minY || -90;
        this.maxY = options.maxY || 90;
        this.units = options.units || "Kilometers";
    }
}

export class SpatialOptionsFactory {
    public geography(): GeographySpatialOptionsFactory {
        return new GeographySpatialOptionsFactory();
    }

    public cartesian(): CartesianSpatialOptionsFactory {
        return new CartesianSpatialOptionsFactory();
    }
}

export class CartesianSpatialOptionsFactory {

    public boundingBoxIndex(): SpatialOptions {
        const opts: SpatialOptions = new SpatialOptions();
        opts.type = "Cartesian";
        opts.strategy = "BoundingBox";
        return opts;
    }

    public quadPrefixTreeIndex(maxTreeLevel: number, bounds: SpatialBounds): SpatialOptions {
        if (maxTreeLevel === 0) {
            throwError("InvalidArgumentException", "maxTreeLevel can't be 0.");
        }

        const opts = new SpatialOptions();
        opts.type = "Cartesian";
        opts.maxTreeLevel = maxTreeLevel;
        opts.strategy = "QuadPrefixTree";
        opts.minX = bounds.minX;
        opts.minY = bounds.minY;
        opts.maxX = bounds.maxX;
        opts.maxY = bounds.maxY;

        return opts;
    }
}

export class SpatialBounds {
    public minX: number;
    public maxX: number;
    public minY: number;
    public maxY: number;

    public constructor(minX: number, minY: number, maxX: number, maxY: number) {
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
    }
}

export class GeographySpatialOptionsFactory {

    /**
     * Defines a Geohash Prefix Tree index using a default Max Tree Level {@link SpatialOptions}
     */
    public defaultOptions(circleRadiusUnits?: SpatialUnits): SpatialOptions {
        circleRadiusUnits = circleRadiusUnits || "Kilometers";
        return this.geohashPrefixTreeIndex(0, circleRadiusUnits);
    }

    public boundingBoxIndex(circleRadiusUnits?: SpatialUnits): SpatialOptions {
        circleRadiusUnits = circleRadiusUnits || "Kilometers";
        const ops = new SpatialOptions();
        ops.type = "Geography";
        ops.strategy = "BoundingBox";
        ops.units = circleRadiusUnits;
        return ops;
    }

    public geohashPrefixTreeIndex(maxTreeLevel: number, circleRadiusUnits?: SpatialUnits): SpatialOptions {
        circleRadiusUnits = circleRadiusUnits || "Kilometers";
        if (maxTreeLevel === 0) {
            maxTreeLevel = DEFAULT_GEOHASH_LEVEL;
        }

        const opts = new SpatialOptions();
        opts.type = "Geography";
        opts.maxTreeLevel = maxTreeLevel;
        opts.strategy = "GeohashPrefixTree";
        opts.units = circleRadiusUnits;
        return opts;
    }

    public quadPrefixTreeIndex(maxTreeLevel: number, circleRadiusUnits: SpatialUnits): SpatialOptions {
        circleRadiusUnits = circleRadiusUnits || "Kilometers";
        if (maxTreeLevel === 0) {
            maxTreeLevel = DEFAULT_QUAD_TREE_LEVEL;
        }

        const opts = new SpatialOptions();
        opts.type = "Geography";
        opts.maxTreeLevel = maxTreeLevel;
        opts.strategy = "QuadPrefixTree";
        opts.units = circleRadiusUnits;
        return opts;
    }
}

export type SpatialRelation =  
    "Within"
   | "Contains"
   | "Disjoint"
   | "Intersects";
