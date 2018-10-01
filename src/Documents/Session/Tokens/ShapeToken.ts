import {QueryToken} from "./QueryToken";
import {SpatialUnits} from "../../Indexes/Spatial";

export class ShapeToken extends QueryToken {

    private readonly _shape: string;

    private constructor(shape: string) {
        super();
        this._shape = shape;
    }

    public static circle(
        radiusParameterName: string,
        latitudeParameterName: string,
        longitudeParameterName: string,
        radiusUnits: SpatialUnits): ShapeToken {
        if (!radiusUnits) {
            return new ShapeToken(
                "spatial.circle($"
                + radiusParameterName
                + ", $" + latitudeParameterName
                + ", $" + longitudeParameterName + ")");
        }

        if (radiusUnits === "Kilometers") {
            return new ShapeToken(
                "spatial.circle($" + radiusParameterName
                + ", $" + latitudeParameterName
                + ", $" + longitudeParameterName
                + ", 'Kilometers')");
        }

        return new ShapeToken(
            "spatial.circle($"
            + radiusParameterName
            + ", $" + latitudeParameterName
            + ", $" + longitudeParameterName
            + ", 'Miles')");
    }

    public static wkt(shapeWktParameterName: string): ShapeToken {
        return new ShapeToken("spatial.wkt($" + shapeWktParameterName + ")");
    }

    public writeTo(writer): void {
        writer.append(this._shape);
    }
}
