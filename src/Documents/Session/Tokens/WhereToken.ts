import { ShapeToken } from "./ShapeToken";
import { QueryToken } from "./QueryToken";
import { SearchOperator } from "../../Queries/SearchOperator";
import { throwError } from "../../../Exceptions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { WhereOperator } from "./WhereOperator";
import { CONSTANTS } from "../../../Constants";

export type MethodsType = "CmpXchg";

export class WhereMethodCall {
    public methodType: MethodsType;
    public parameters: string[];
    public property: string;
}

export interface WhereOptionsShapeRelatedParameters {
    shape: ShapeToken;
    distance: number;
}

export interface WhereOptionsSearchRelatedParameters {
    search: SearchOperator;
}

export interface WhereOptionsExactFromToRelatedParameters {
    exact: boolean;
    from?: string;
    to?: string;
}

export interface WhereOptionsMethodTypeRelatedParameters {
    methodType: MethodsType;
    parameters: string[];
    property: string;
    exact: boolean;
}

export type WhereOptionsParameters =
    WhereOptionsShapeRelatedParameters
    | WhereOptionsExactFromToRelatedParameters
    | WhereOptionsMethodTypeRelatedParameters
    | WhereOptionsSearchRelatedParameters;

export class WhereOptions {
    public searchOperator: SearchOperator;
    public fromParameterName: string;
    public toParameterName: string;
    public boost: number;
    public fuzzy: number;
    public proximity: number;
    public exact: boolean;
    public method: WhereMethodCall;
    public whereShape: ShapeToken;
    public distanceErrorPct: number;

    public static defaultOptions() {
        return new WhereOptions();
    }

    public constructor(parameters?: WhereOptionsParameters) {
        parameters = parameters || {} as WhereOptionsParameters;
        if (parameters["methodType"]) {
            const p = parameters as WhereOptionsMethodTypeRelatedParameters;
            if (TypeUtil.isNullOrUndefined(p.exact)) {
                p.exact = false;
            }

            this.method = new WhereMethodCall();
            this.method.methodType = p.methodType;
            this.method.parameters = p.parameters;
            this.method.property = p.property;

            this.exact = p.exact;
        } else if (parameters["shape"]) {
            const p = parameters as WhereOptionsShapeRelatedParameters;
            this.whereShape = p.shape;
            this.distanceErrorPct = p.distance;
        } else if (!TypeUtil.isNullOrUndefined(parameters["exact"])
            && !parameters["methodType"]) {
            const p = parameters as WhereOptionsExactFromToRelatedParameters;
            this.exact = p.exact;
            this.fromParameterName = p.from;
            this.toParameterName = p.to;
        } else if (parameters["search"]) {
            this.searchOperator = parameters["search"] as SearchOperator;
        }
    }
}

export class WhereToken extends QueryToken {

    protected constructor() {
        super();
    }

    public fieldName: string;
    public whereOperator: WhereOperator;
    public parameterName: string;
    public options: WhereOptions;

    public static create(op: WhereOperator, fieldName: string, parameterName: string): WhereToken;
    public static create(
        op: WhereOperator, fieldName: string, parameterName: string, options: WhereOptions): WhereToken;
    public static create(
        op: WhereOperator, fieldName: string, parameterName: string, options: WhereOptions = null): WhereToken {
        const token = new WhereToken();
        token.fieldName = fieldName;
        token.parameterName = parameterName;
        token.whereOperator = op;
        token.options = options || WhereOptions.defaultOptions();
        return token;
    }

    public addAlias(alias: string): WhereToken {
        if ("id()" === this.fieldName) {
            return this;
        }

        this.fieldName = alias + "." + this.fieldName;

        const whereToken = new WhereToken();
        whereToken.fieldName = alias + "." + this.fieldName;
        whereToken.parameterName = this.parameterName;
        whereToken.whereOperator = this.whereOperator;
        whereToken.options = this.options;
        
        return whereToken;
    }

    private _writeMethod(writer): boolean {
        if (this.options.method) {
            switch (this.options.method.methodType) {
                case "CmpXchg":
                    writer.append("cmpxchg(");
                    break;
                default:
                    throwError("InvalidArgumentException",
                        "Unsupported method: " + this.options.method.methodType);
            }

            let first: boolean = true;
            for (const parameter of this.options.method.parameters) {
                if (!first) {
                    writer.append(",");
                }
                first = false;
                writer.append("$");
                writer.append(parameter);
            }
            writer.append(")");

            if (this.options.method.property) {
                writer.append(".")
                    .append(this.options.method.property);
            }
            return true;
        }

        return false;
    }

    public writeTo(writer): void {
        if (this.options.boost != null) {
            writer.append("boost(");
        }

        if (this.options.fuzzy != null) {
            writer.append("fuzzy(");
        }

        if (this.options.proximity != null) {
            writer.append("proximity(");
        }

        if (this.options.exact) {
            writer.append("exact(");
        }

        switch (this.whereOperator) {
            case "Search":
                writer.append("search(");
                break;
            case "Lucene":
                writer.append("lucene(");
                break;
            case "StartsWith":
                writer.append("startsWith(");
                break;
            case "EndsWith":
                writer.append("endsWith(");
                break;
            case "Exists":
                writer.append("exists(");
                break;
            case "SpatialWithin":
                writer.append("spatial.within(");
                break;
            case "SpatialContains":
                writer.append("spatial.contains(");
                break;
            case "SpatialDisjoint":
                writer.append("spatial.disjoint(");
                break;
            case "SpatialIntersects":
                writer.append("spatial.intersects(");
                break;
            case "Regex":
                writer.append("regex(");
                break;
        }

        this._writeInnerWhere(writer);

        if (this.options.exact) {
            writer.append(")");
        }

        if (this.options.proximity != null) {
            writer
                .append(", ")
                .append(this.options.proximity)
                .append(")");
        }

        if (this.options.fuzzy != null) {
            writer
                .append(", ")
                .append(this.options.fuzzy)
                .append(")");
        }

        if (this.options.boost != null) {
            writer
                .append(", ")
                .append(this.options.boost)
                .append(")");
        }
    }

    private _writeInnerWhere(writer): void {
        QueryToken.writeField(writer, this.fieldName);

        switch (this.whereOperator) {
            case "Equals":
                writer.append(" = ");
                break;

            case "NotEquals":
                writer.append(" != ");
                break;
            case "GreaterThan":
                writer
                    .append(" > ");
                break;
            case "GreaterThanOrEqual":
                writer
                    .append(" >= ");
                break;
            case "LessThan":
                writer
                    .append(" < ");
                break;
            case "LessThanOrEqual":
                writer
                    .append(" <= ");
                break;
            default:
                this._specialOperator(writer);
                return;
        }

        if (!this._writeMethod(writer)) {
            writer.append("$").append(this.parameterName);
        }
    }

    private _specialOperator(writer): void {
        switch (this.whereOperator) {
            case "In":
                writer
                    .append(" in ($")
                    .append(this.parameterName)
                    .append(")");
                break;
            case "AllIn":
                writer
                    .append(" all in ($")
                    .append(this.parameterName)
                    .append(")");
                break;
            case "Between":
                writer
                    .append(" between $")
                    .append(this.options.fromParameterName)
                    .append(" and $")
                    .append(this.options.toParameterName);
                break;

            case "Search":
                writer
                    .append(", $")
                    .append(this.parameterName);
                if (this.options.searchOperator === "AND") {
                    writer.append(", and");
                }
                writer.append(")");
                break;
            case "Lucene":
            case "StartsWith":
            case "EndsWith":
            case "Regex":
                writer
                    .append(", $")
                    .append(this.parameterName)
                    .append(")");
                break;
            case "Exists":
                writer
                    .append(")");
                break;
            case "SpatialWithin":
            case "SpatialContains":
            case "SpatialDisjoint":
            case "SpatialIntersects":
                writer
                    .append(", ");
                this.options.whereShape.writeTo(writer);

                if (Math.abs(this.options.distanceErrorPct - CONSTANTS.Documents.Indexing.Spatial.DEFAULT_DISTANCE_ERROR_PCT) > 1e-40) {
                    writer.append(", ");
                    writer.append(this.options.distanceErrorPct);
                }
                writer
                    .append(")");
                break;
            default:
                throwError("InvalidArgumentException");
        }
    }
}
