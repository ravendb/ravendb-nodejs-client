import { QueryToken } from "./QueryToken";
import { throwError } from "../../../Exceptions/index";
import { StringUtil } from "../../../Utility/StringUtil";
import { Facet } from "../../Queries/Facets/Facet";
import { FacetAggregation, FacetOptions } from "../../Queries/Facets";
import { FacetBase } from "../../Queries/Facets/FacetBase";
import * as StringBuilder from "string-builder";
import { GenericRangeFacet } from "../../Queries/Facets/GenericRangeFacet";
import { RangeFacet } from "../../Queries/Facets/RangeFacet";

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
    private _facetSetupDocumentId: string;
    private _aggregateByFieldName: string;
    private _alias: string;
    private _ranges: string[];
    private _optionsParameterName: string;
     private _aggregations: FacetAggregationToken[];

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
    public static create(facet: GenericRangeFacet, addQueryParameter: (o: object) => string): FacetToken;
    public static create(facet: RangeFacet, addQueryParameter: (o: object) => string): FacetToken;
    public static create(facet: Facet, addQueryParameter: (o: object) => string): FacetToken;
    public static create(facet: FacetBase, addQueryParameter: (o: object) => string): FacetToken;
    public static create(
        facetSetupDocumentIdOrFacet: string | FacetBase, 
        addQueryParameter?: (o: object) => string): FacetToken {
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
                aggregateByFieldName: (facet as Facet).fieldName, 
                alias: facet.displayFieldName, 
                optionsParameterName
            });
            FacetToken._applyAggregations(facet, token);
            return token;
        }

        if (facet instanceof RangeFacet) {
            const optionsParameterName = FacetToken._getOptionsParameterName(facet, addQueryParameter);
            const token = new FacetToken({
                alias: facet.displayFieldName, 
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
                alias: facet.displayFieldName, 
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
        for (const [ aggregationKey, aggregationValue ] of facet.aggregations.entries()) {
            let aggregationToken: FacetAggregationToken;
            switch (aggregationKey) {
                case "Max":
                    aggregationToken = FacetAggregationToken.max(aggregationValue);
                    break;
                case "Min":
                    aggregationToken = FacetAggregationToken.min(aggregationValue);
                    break;
                case "Average":
                    aggregationToken = FacetAggregationToken.average(aggregationValue);
                    break;
                case "Sum":
                    aggregationToken = FacetAggregationToken.sum(aggregationValue);
                    break;
                default :
                    throwError("NotImplementedException", "Unsupported aggregation method: " + aggregationKey);
            }

            token._aggregations.push(aggregationToken);
        }
    }

    private static _getOptionsParameterName(
        facet: FacetBase,
        addQueryParameter: (o: object) => string): string {
        return facet.options && facet.options !== FacetOptions.getDefaultOptions()
            ? addQueryParameter(facet.options)
            : null;
    }

}

export class FacetAggregationToken extends QueryToken {

    private _fieldName: string;
    private _aggregation: FacetAggregation;

    private constructor(fieldName: string, aggregation: FacetAggregation) {
        super();
        this._fieldName = fieldName;
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
    }

    public static max(fieldName: string): FacetAggregationToken {
        if (StringUtil.isNullOrWhitespace(fieldName)) {
            throwError("InvalidArgumentException", "FieldName can not be null");
        }

        return new FacetAggregationToken(fieldName, "Max");
    }

    public static min(fieldName: string): FacetAggregationToken {
        if (StringUtil.isNullOrWhitespace(fieldName)) {
            throwError("InvalidArgumentException", "FieldName can not be null");
        }

        return new FacetAggregationToken(fieldName, "Min");
    }

    public static average(fieldName: string): FacetAggregationToken {
        if (StringUtil.isNullOrWhitespace(fieldName)) {
            throwError("InvalidArgumentException", "FieldName can not be null");
        }

        return new FacetAggregationToken(fieldName, "Average");
    }

    public static sum(fieldName: string): FacetAggregationToken {
        if (StringUtil.isNullOrWhitespace(fieldName)) {
            throwError("InvalidArgumentException", "FieldName can not be null");
        }
        return new FacetAggregationToken(fieldName, "Sum");
    }
}
