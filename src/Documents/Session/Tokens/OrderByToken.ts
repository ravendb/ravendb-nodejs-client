import { QueryToken } from "./QueryToken.js";
import { NullsOrdering, OrderingType } from "../OrderingType.js";
import { throwError } from "../../../Exceptions/index.js";
import { CONSTANTS } from "../../../Constants.js";

type OrderByTokenOptions = {
    ordering?: OrderingType;
    sorterName?: string;
    nullsOrdering?: NullsOrdering;
}

export class OrderByToken extends QueryToken {

    private readonly _fieldName: string;
    private readonly _descending: boolean;
    private readonly _sorterName: string;
    private readonly _ordering: OrderingType;
    private readonly _nullsOrdering: NullsOrdering;
    private readonly _isMethodField: boolean;

    private constructor(fieldName: string, descending: boolean, options: OrderByTokenOptions, isMethodField: boolean) {
        super();
        this._fieldName = fieldName;
        this._descending = descending;
        this._ordering = options.ordering;
        this._sorterName = options.sorterName;
        this._nullsOrdering = options.nullsOrdering ?? "Default";
        this._isMethodField = isMethodField;
    }

    public static random: OrderByToken = new OrderByToken("random()", false, { ordering: "String" }, true);

    public static scoreAscending = new OrderByToken("score()", false, { ordering: "String" }, true);

    public static scoreDescending = new OrderByToken("score()", true, { ordering: "String" }, true);

    public static createDistanceAscendingLatLng(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string, roundFactorParameterName?: string, nulls: NullsOrdering = "Default"): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName +
            ", spatial.point($" + latitudeParameterName
            + ", $" + longitudeParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", false, { ordering: "String", nullsOrdering: nulls }, true);
    }

    public static createDistanceAscendingWkt(fieldName: string, shapeWktParameterName: string, roundFactorParameterName?: string, nulls: NullsOrdering = "Default"): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.wkt($" + shapeWktParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", false, { ordering: "String", nullsOrdering: nulls }, true);
    }

    public static createDistanceDescendingLatLng(
        fieldName: string, latitudeParameterName: string, longitudeParameterName: string, roundFactorParameterName?: string, nulls: NullsOrdering = "Default"): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.point($" + latitudeParameterName
            + ", $" + longitudeParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", true, { ordering: "String", nullsOrdering: nulls }, true);
    }

    public static createDistanceDescendingWkt(fieldName: string, shapeWktParameterName: string, roundFactorParameterName?: string, nulls: NullsOrdering = "Default"): OrderByToken {
        return new OrderByToken(
            "spatial.distance(" + fieldName
            + ", spatial.wkt($" + shapeWktParameterName + ")" + (roundFactorParameterName ? ", $" + roundFactorParameterName : "") + ")", true, { ordering: "String", nullsOrdering: nulls }, true);
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
                case "Long": {
                    writer.append(" as long");
                    break;
                }
                case "Double": {
                    writer.append(" as double");
                    break;
                }
                case "AlphaNumeric": {
                    writer.append(" as alphaNumeric");
                    break;
                }
            }
        }

        if (this._descending) { // we only add this if we have to, ASC is the default and reads nicer
            writer.append(" desc");
        }

        if (this._nullsOrdering === "First") {
            writer.append(" nulls first");
        } else if (this._nullsOrdering === "Last") {
            writer.append(" nulls last");
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
            return new OrderByToken(aliasedName, this._descending, { ordering: this._ordering, nullsOrdering: this._nullsOrdering }, false);
        }
    }
}
