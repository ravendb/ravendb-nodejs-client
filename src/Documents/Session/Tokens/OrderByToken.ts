import { QueryToken } from "./QueryToken";
import { OrderingType } from "../OrderingType";
import { throwError } from "../../../Exceptions";
import { CONSTANTS, INDEXES } from "../../../Constants";

type OrderByTokenOptions = {
    ordering?: OrderingType;
    sorterName?: string;
}

export class OrderByToken extends QueryToken {

    private readonly _fieldName: string;
    private readonly _descending: boolean;
    private readonly _sorterName: string;
    private readonly _ordering: OrderingType;
    private readonly _isMethodField: boolean;

    private constructor(fieldName: string, descending: boolean, options: OrderByTokenOptions, isMethodField: boolean) {
        super();
        this._fieldName = fieldName;
        this._descending = descending;
        this._ordering = options.ordering;
        this._sorterName = options.sorterName;
        this._isMethodField = isMethodField;
    }

    public static random: OrderByToken = new OrderByToken("random()", false, { ordering: "String" }, true);

    public static scoreAscending = new OrderByToken("score()", false, { ordering: "String" }, true);

    public static scoreDescending = new OrderByToken("score()", true, { ordering: "String" }, true);

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
            + ", $" + longitudeParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", false, { ordering: "String" }, true);
    }

    private static _createDistanceAscendingWkt(fieldName: string, shapeWktParameterName: string, roundFactorParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.wkt($" + shapeWktParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", false, { ordering: "String" }, true);
    }

    private static _createDistanceDescendingLatLng(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string, roundFactorParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.point($" + latitudeParameterName
            + ", $" + longitudeParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", true, { ordering: "String" }, true);
    }

    private static _createDistanceDescendingWkt(fieldName: string, shapeWktParameterName: string, roundFactorParameterName: string): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.wkt($" + shapeWktParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", true, { ordering: "String" }, true);
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

        return new OrderByToken("random('" + seed.replace(/'/g, "''") + "')", false, { ordering: "String" }, true);
    }

    public static createAscending(fieldName: string, options: OrderByTokenOptions): OrderByToken {
        return new OrderByToken(fieldName, false, options, false);
    }

    public static createDescending(fieldName: string, options: OrderByTokenOptions): OrderByToken {
        return new OrderByToken(fieldName, true, options, false);
    }

    public writeTo(writer): void {
        if (this._sorterName) {
            writer
                .append("custom(")
        }
        QueryToken.writeField(writer, this._fieldName);

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

    public addAlias(alias: string): OrderByToken {
        if (CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME === this._fieldName) {
            return this;
        }

        if (this._isMethodField) { // we must not alias RQL methods
            return this;
        }

        const aliasedName = alias + "." + this._fieldName;

        if (this._sorterName) {
            return new OrderByToken(aliasedName, this._descending, { sorterName: this._sorterName }, false);
        } else {
            return new OrderByToken(aliasedName, this._descending, { ordering: this._ordering }, false);
        }
    }
}
