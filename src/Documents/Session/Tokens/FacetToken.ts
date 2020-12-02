import { QueryToken } from "./QueryToken";
import { throwError } from "../../../Exceptions/index";
import { StringUtil } from "../../../Utility/StringUtil";
import { Facet } from "../../Queries/Facets/Facet";
import { FacetAggregation, FacetOptions } from "../../Queries/Facets";
import { FacetBase } from "../../Queries/Facets/FacetBase";
import { GenericRangeFacet } from "../../Queries/Facets/GenericRangeFacet";
import { RangeFacet } from "../../Queries/Facets/RangeFacet";
import { QueryFieldUtil } from "../../Queries/QueryFieldUtil";
import { StringBuilder } from "../../../Utility/StringBuilder";

export interface FacetTokenSetupDocumentIdOptions {
    facetSetupDocumentId: string;
}

export interface FacetTokenAggregateByFieldNameOptions {
    aggregateByFieldName?: string;
    alias: string;
    ranges?: string[];
    optionsParameterName: string;
}

export class FacetToken extends QueryToken {
    private readonly _facetSetupDocumentId: string;
    private readonly _aggregateByFieldName: string;
    private readonly _alias: string;
    private readonly _ranges: string[];
    private readonly _optionsParameterName: string;
    private readonly _aggregations: FacetAggregationToken[];

    public getName(): string {
        return this._alias || this._aggregateByFieldName;
    }

    private constructor(opts: FacetTokenSetupDocumentIdOptions);
    private constructor(opts: FacetTokenAggregateByFieldNameOptions);
    private constructor(opts: FacetTokenSetupDocumentIdOptions | FacetTokenAggregateByFieldNameOptions) {
        super();

        if (!opts) {
            throwError("InvalidArgumentException", "FacetToken options cannot be null.");
        }

        if (opts.hasOwnProperty("facetSetupDocumentId" as keyof FacetTokenSetupDocumentIdOptions)) {
            this._facetSetupDocumentId = (opts as FacetTokenSetupDocumentIdOptions).facetSetupDocumentId;
        } else if (opts.hasOwnProperty("aggregateByFieldName" as keyof FacetTokenAggregateByFieldNameOptions)
            || opts.hasOwnProperty("alias" as keyof FacetTokenAggregateByFieldNameOptions)) {
            this._aggregateByFieldName =
                (opts as FacetTokenAggregateByFieldNameOptions).aggregateByFieldName;
            this._alias =
                (opts as FacetTokenAggregateByFieldNameOptions).alias;
            this._ranges =
                (opts as FacetTokenAggregateByFieldNameOptions).ranges;
            this._optionsParameterName =
                (opts as FacetTokenAggregateByFieldNameOptions).optionsParameterName;
            this._aggregations = [];
        } else {
            throwError("InvalidArgumentException", "Invalid facet token arguments.");
        }
    }

    public static create(facetSetupDocumentId: string): FacetToken;
    public static create(facet: GenericRangeFacet, addQueryParameter: (o: any) => string): FacetToken;
    public static create(facet: RangeFacet, addQueryParameter: (o: any) => string): FacetToken;
    public static create(facet: Facet, addQueryParameter: (o: any) => string): FacetToken;
    public static create(facet: FacetBase, addQueryParameter: (o: any) => string): FacetToken;
    public static create(
        facetSetupDocumentIdOrFacet: string | FacetBase,
        addQueryParameter?: (o: any) => string): FacetToken {
        if (!facetSetupDocumentIdOrFacet) {
            throwError("InvalidArgumentException", "Need to supply either facetSetupDocumentId or a Facet instance.");
        }

        if (typeof facetSetupDocumentIdOrFacet === "string") {
            if (StringUtil.isNullOrWhitespace(facetSetupDocumentIdOrFacet)) {
                throwError("InvalidArgumentException", "facetSetupDocumentId cannot be null");
            }

            return new FacetToken({ facetSetupDocumentId: facetSetupDocumentIdOrFacet });
        }

        const facet: FacetBase = facetSetupDocumentIdOrFacet;
        if (facetSetupDocumentIdOrFacet instanceof Facet) {
            const optionsParameterName = FacetToken._getOptionsParameterName(facet, addQueryParameter);
            const token = new FacetToken({
                aggregateByFieldName: QueryFieldUtil.escapeIfNecessary((facet as Facet).fieldName),
                alias: QueryFieldUtil.escapeIfNecessary(facet.displayFieldName),
                optionsParameterName
            });
            FacetToken._applyAggregations(facet, token);
            return token;
        }

        if (facet instanceof RangeFacet) {
            const optionsParameterName = FacetToken._getOptionsParameterName(facet, addQueryParameter);
            const token = new FacetToken({
                alias: QueryFieldUtil.escapeIfNecessary(facet.displayFieldName),
                ranges: (facet as RangeFacet).ranges,
                optionsParameterName
            });
            FacetToken._applyAggregations(facet, token);
            return token;
        }

        if (facet instanceof GenericRangeFacet) {
            const optionsParameterName = FacetToken._getOptionsParameterName(facet, addQueryParameter);
            const ranges = [];
            for (const rangeBuilder of (facet as GenericRangeFacet).ranges) {
                ranges.push(GenericRangeFacet.parse(rangeBuilder, addQueryParameter));
            }
            const token: FacetToken = new FacetToken({
                alias: QueryFieldUtil.escapeIfNecessary(facet.displayFieldName),
                ranges,
                optionsParameterName
            });
            FacetToken._applyAggregations(facet, token);
            return token;
        }

        // this is just a dispatcher
        return facet.toFacetToken(addQueryParameter);
    }

    public writeTo(writer: StringBuilder): void {
        writer.append("facet(");
        if (this._facetSetupDocumentId) {
            writer.append(`id('${this._facetSetupDocumentId}'))`);
            return;
        }

        let firstArgument = false;
        if (this._aggregateByFieldName) {
            writer.append(this._aggregateByFieldName);
        } else if (this._ranges) {
            let firstInRange = true;
            for (const range of this._ranges) {
                if (!firstInRange) {
                    writer.append(", ");
                }

                firstInRange = false;
                writer.append(range);
            }
        } else {
            firstArgument = true;
        }

        for (const aggregation of this._aggregations) {
            if (!firstArgument) {
                writer.append(", ");
            }
            firstArgument = false;
            aggregation.writeTo(writer);
        }

        if (this._optionsParameterName) {
            writer.append(`, $${this._optionsParameterName}`);
        }

        writer.append(")");
        if (!this._alias || this._alias === this._aggregateByFieldName) {
            return;
        }

        writer.append(` as ${this._alias}`);
    }

    private static _applyAggregations(facet: FacetBase, token: FacetToken): void {
        for (const [aggregationKey, aggregationValue] of facet.aggregations.entries()) {
            for (let value of aggregationValue) {
                let aggregationToken: FacetAggregationToken;
                switch (aggregationKey) {
                    case "Max":
                        aggregationToken = FacetAggregationToken.max(value.name, value.displayName);
                        break;
                    case "Min":
                        aggregationToken = FacetAggregationToken.min(value.name, value.displayName);
                        break;
                    case "Average":
                        aggregationToken = FacetAggregationToken.average(value.name, value.displayName);
                        break;
                    case "Sum":
                        aggregationToken = FacetAggregationToken.sum(value.name, value.displayName);
                        break;
                    default :
                        throwError("NotImplementedException", "Unsupported aggregation method: " + aggregationKey);
                }

                token._aggregations.push(aggregationToken);
            }
        }
    }

    private static _getOptionsParameterName(
        facet: FacetBase,
        addQueryParameter: (o: any) => string): string {
        return facet.options && facet.options !== FacetOptions.getDefaultOptions()
            ? addQueryParameter(facet.options)
            : null;
    }
}

export class FacetAggregationToken extends QueryToken {

    private _fieldName: string;
    private _fieldDisplayName: string;
    private readonly _aggregation: FacetAggregation;

    private constructor(fieldName: string, fieldDisplayName: string, aggregation: FacetAggregation) {
        super();
        this._fieldName = fieldName;
        this._fieldDisplayName = fieldDisplayName;
        this._aggregation = aggregation;
    }

    public writeTo(writer: StringBuilder): void {
        switch (this._aggregation) {
            case "Max":
                writer
                    .append("max(")
                    .append(this._fieldName)
                    .append(")");
                break;
            case "Min":
                writer
                    .append("min(")
                    .append(this._fieldName)
                    .append(")");
                break;
            case "Average":
                writer
                    .append("avg(")
                    .append(this._fieldName)
                    .append(")");
                break;
            case "Sum":
                writer
                    .append("sum(")
                    .append(this._fieldName)
                    .append(")");
                break;
            default:
                throwError("InvalidArgumentException", "Invalid aggregation mode: " + this._aggregation);
        }

        if (StringUtil.isNullOrWhitespace(this._fieldDisplayName)) {
            return;
        }

        writer.append(" as ");
        this._writeField(writer, this._fieldDisplayName);
    }

    public static max(fieldName: string): FacetAggregationToken
    public static max(fieldName: string, fieldDisplayName: string): FacetAggregationToken
    public static max(fieldName: string, fieldDisplayName?: string): FacetAggregationToken {
        if (StringUtil.isNullOrWhitespace(fieldName)) {
            throwError("InvalidArgumentException", "FieldName can not be null");
        }

        return new FacetAggregationToken(fieldName, fieldDisplayName, "Max");
    }

    public static min(fieldName: string): FacetAggregationToken
    public static min(fieldName: string, fieldDisplayName: string): FacetAggregationToken
    public static min(fieldName: string, fieldDisplayName?: string): FacetAggregationToken {
        if (StringUtil.isNullOrWhitespace(fieldName)) {
            throwError("InvalidArgumentException", "FieldName can not be null");
        }

        return new FacetAggregationToken(fieldName, fieldDisplayName, "Min");
    }

    public static average(fieldName: string): FacetAggregationToken
    public static average(fieldName: string, fieldDisplayName: string): FacetAggregationToken
    public static average(fieldName: string, fieldDisplayName?: string): FacetAggregationToken {
        if (StringUtil.isNullOrWhitespace(fieldName)) {
            throwError("InvalidArgumentException", "FieldName can not be null");
        }

        return new FacetAggregationToken(fieldName, fieldDisplayName, "Average");
    }

    public static sum(fieldName: string): FacetAggregationToken
    public static sum(fieldName: string, fieldDisplayName: string): FacetAggregationToken
    public static sum(fieldName: string, fieldDisplayName?: string): FacetAggregationToken {
        if (StringUtil.isNullOrWhitespace(fieldName)) {
            throwError("InvalidArgumentException", "FieldName can not be null");
        }
        return new FacetAggregationToken(fieldName, fieldDisplayName, "Sum");
    }
}
