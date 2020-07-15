import { QueryToken } from "./QueryToken";
import { OrderingType } from "../OrderingType";
import { throwError } from "../../../Exceptions";

type OrderByTokenOptions = {
    ordering?: OrderingType;
    sorterName?: string;
}

export class OrderByToken extends QueryToken {

    private readonly _fieldName: string;
    private readonly _descending: boolean;
    private readonly _sorterName: string;
    private readonly _ordering: OrderingType;

    private constructor(fieldName: string, descending: boolean, options: OrderByTokenOptions) {
        super();
        this._fieldName = fieldName;
        this._descending = descending;
        this._ordering = options.ordering;
        this._sorterName = options.sorterName;
    }

    public static random: OrderByToken = new OrderByToken("random()", false, { ordering: "String" });

    public static scoreAscending = new OrderByToken("score()", false, { ordering: "String" });

    public static scoreDescending = new OrderByToken("score()", true, { ordering: "String" });

    public static createDistanceAscending(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string, roundFactorParameterName: string): OrderByToken;
    public static createDistanceAscending(fieldName: string, shapeWktParameterName: string, roundFactorParameterName: string): OrderByToken;
    public static createDistanceAscending(
        fieldName: string, shapeWktOrLatitudeParameterName: string, longitudeParameterName?: string, roundFactorParameterName?: string): OrderByToken {
        if (longitudeParameterName) {
            return this._createDistanceAscendingLatLng(
                fieldName, shapeWktOrLatitudeParameterName, longitudeParameterName, roundFactorParameterName);
        } else {
            return this._createDistanceAscendingWkt(fieldName, shapeWktOrLatitudeParameterName, roundFactorParameterName);
        }
    }

    private static _createDistanceAscendingLatLng(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string, roundFactorParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName +
            ", spatial.point($" + latitudeParameterName
            + ", $" + longitudeParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", false, { ordering: "String" });
    }

    private static _createDistanceAscendingWkt(fieldName: string, shapeWktParameterName: string, roundFactorParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.wkt($" + shapeWktParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", false, { ordering: "String" });
    }

    private static _createDistanceDescendingLatLng(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string, roundFactorParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.point($" + latitudeParameterName
            + ", $" + longitudeParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", true, { ordering: "String" });
    }

    private static _createDistanceDescendingWkt(fieldName: string, shapeWktParameterName: string, roundFactorParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.wkt($" + shapeWktParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", true, { ordering: "String" });
    }

    public static createDistanceDescending(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string, roundFactorParameterName: string): OrderByToken;
    public static createDistanceDescending(fieldName: string, shapeWktParameterName: string, roundFactorParameterName: string): OrderByToken;
    public static createDistanceDescending(
        fieldName: string, shapeWktOrLatitudeParameterName: string, longitudeParameterName?: string, roundFactorParameterName?: string): OrderByToken {
        if (longitudeParameterName) {
            return this._createDistanceDescendingLatLng(
                fieldName, shapeWktOrLatitudeParameterName, longitudeParameterName, roundFactorParameterName);
        } else {
            return this._createDistanceDescendingWkt(fieldName, shapeWktOrLatitudeParameterName, roundFactorParameterName);
        }
    }

    public static createRandom(seed: string): OrderByToken {
        if (!seed) {
            throwError("InvalidArgumentException", "seed cannot be null");
        }

        return new OrderByToken("random('" + seed.replace(/'/g, "''") + "')", false, { ordering: "String" });
    }

    public static createAscending(fieldName: string, options: OrderByTokenOptions): OrderByToken {
        return new OrderByToken(fieldName, false, options);
    }

    public static createDescending(fieldName: string, options: OrderByTokenOptions): OrderByToken {
        return new OrderByToken(fieldName, true, options);
    }

    public writeTo(writer): void {
        if (this._sorterName) {
            writer
                .append("custom(")
        }
        this._writeField(writer, this._fieldName);

        if (this._sorterName) {
            writer
                .append(", '")
                .append(this._sorterName)
                .append("')");
        } else {
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
        }

        if (this._descending) { // we only add this if we have to, ASC is the default and reads nicer
            writer.append(" desc");
        }
    }
}
