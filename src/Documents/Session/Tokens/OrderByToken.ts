import {QueryToken} from "./QueryToken";
import {OrderingType} from "../OrderingType";
import {throwError} from "../../../Exceptions";

export class OrderByToken extends QueryToken {

    private readonly _fieldName: string;
    private readonly _descending: boolean;
    private readonly _ordering: OrderingType;

    private constructor(fieldName: string, descending: boolean, ordering: OrderingType) {
        super();
        this._fieldName = fieldName;
        this._descending = descending;
        this._ordering = ordering;
    }

    public static random: OrderByToken = new OrderByToken("random()", false, "String");

    public static scoreAscending = new OrderByToken("score()", false, "String");

    public static scoreDescending = new OrderByToken("score()", true, "String");

    public static createDistanceAscending(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string): OrderByToken;
    public static createDistanceAscending(fieldName: string, shapeWktParameterName: string): OrderByToken;
    public static createDistanceAscending(
        fieldName: string, shapeWktOrLatitudeParameterName: string, longitudeParameterName?: string): OrderByToken {
        if (longitudeParameterName) {
            return this._createDistanceAscendingLatLng(
                fieldName, shapeWktOrLatitudeParameterName, longitudeParameterName);
        } else {
            return this._createDistanceAscendingWkt(fieldName, shapeWktOrLatitudeParameterName);
        }
    }

    private static _createDistanceAscendingLatLng(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName +
            ", spatial.point($" + latitudeParameterName
            + ", $" + longitudeParameterName + "))", false, "String");
    }

    private static _createDistanceAscendingWkt(fieldName: string, shapeWktParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.wkt($" + shapeWktParameterName + "))", false, "String");
    }

    private static _createDistanceDescendingLatLng(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.point($" + latitudeParameterName
            + ", $" + longitudeParameterName + "))", true, "String");
    }

    private static _createDistanceDescendingWkt(fieldName: string, shapeWktParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.wkt($" + shapeWktParameterName + "))", true, "String");
    }

    public static createDistanceDescending(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string): OrderByToken;
    public static createDistanceDescending(fieldName: string, shapeWktParameterName: string): OrderByToken;
    public static createDistanceDescending(
        fieldName: string, shapeWktOrLatitudeParameterName: string, longitudeParameterName?: string): OrderByToken {
        if (longitudeParameterName) {
            return this._createDistanceDescendingLatLng(
                fieldName, shapeWktOrLatitudeParameterName, longitudeParameterName);
        } else {
            return this._createDistanceDescendingWkt(fieldName, shapeWktOrLatitudeParameterName);
        }
    }

    public static createRandom(seed: string): OrderByToken {
        if (!seed) {
            throwError("InvalidArgumentException", "seed cannot be null");
        }

        return new OrderByToken("random('" + seed.replace(/'/g, "''") + "')", false, "String");
    }

    public static createAscending(fieldName: string, ordering: OrderingType): OrderByToken {
        return new OrderByToken(fieldName, false, ordering);
    }

    public static createDescending(fieldName: string, ordering: OrderingType): OrderByToken {
        return new OrderByToken(fieldName, true, ordering);
    }

    public writeTo(writer): void {
        this._writeField(writer, this._fieldName);

        switch (this._ordering) {
            case "Long":
                writer.append(" as long");
                break;
            case "Double":
                writer.append(" as double");
                break;
            case "AlphaNumeric":
                writer.append(" as alphaNumeric");
                break;
        }

        if (this._descending) { // we only add this if we have to, ASC is the default and reads nicer
            writer.append(" desc");
        }
    }
}
