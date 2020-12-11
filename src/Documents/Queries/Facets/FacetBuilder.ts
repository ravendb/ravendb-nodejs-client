import { IFacetBuilder } from "./IFacetBuilder";
import { IFacetOperations } from "./IFacetOperations";
import { GenericRangeFacet } from "./GenericRangeFacet";
import { Facet } from "./Facet";
import { RangeBuilder } from "./RangeBuilder";
import { throwError } from "../../../Exceptions";
import { FacetOptions } from ".";
import { FacetBase } from "./FacetBase";
import { FacetAggregationField } from "./FacetAggregationField";
import { Field } from "../../../Types";

export class FacetBuilder<T> implements IFacetBuilder<T>, IFacetOperations<T> {
    private _range: GenericRangeFacet;
    private _default: Facet;

    private static _rqlKeywords: Set<string> = new Set([
        "as",
        "select",
        "where",
        "load",
        "group",
        "order",
        "include",
        "update"
    ]);

    public byRanges(range: RangeBuilder, ...ranges: RangeBuilder[]): IFacetOperations<T> {
        if (!range) {
            throwError("InvalidArgumentException", "Range cannot be null");
        }

        if (!this._range) {
            this._range = new GenericRangeFacet();
        }

        this._range.ranges.push(range);
        if (ranges) {
            this._range.ranges.push(...ranges);
        }

        return this;
    }

    public byField(fieldName: Field<T>): IFacetOperations<T> {
        if (!this._default) {
            this._default = new Facet();
        }

        if (FacetBuilder._rqlKeywords.has(fieldName)) {
            fieldName = `'${fieldName}'`;
        }

        this._default.fieldName = fieldName;
        return this;
    }

    public allResults(): IFacetOperations<T> {
        if (!this._default) {
            this._default = new Facet();
        }

        this._default.fieldName = null;
        return this;
    }

    public withOptions(options: FacetOptions): IFacetOperations<T> {
        this.getFacet().options = options;
        return this;
    }

    public withDisplayName(displayName: string): IFacetOperations<T> {
        this.getFacet().displayFieldName = displayName;
        return this;
    }

    public sumOn(path: string): IFacetOperations<T>
    public sumOn(path: string, displayName: string): IFacetOperations<T>
    public sumOn(path: string, displayName?: string): IFacetOperations<T> {
        const aggregationsMap = this.getFacet().aggregations;
        if (!aggregationsMap.has("Sum")) {
            aggregationsMap.set("Sum", new Set<FacetAggregationField>());
        }

        const aggregations = aggregationsMap.get("Sum");

        const aggregationField = new FacetAggregationField();
        aggregationField.name = path;
        aggregationField.displayName = displayName;

        aggregations.add(aggregationField);

        return this;
    }

    public minOn(path: string): IFacetOperations<T>;
    public minOn(path: string, displayName: string): IFacetOperations<T>;
    public minOn(path: string, displayName?: string): IFacetOperations<T> {
        const aggregationsMap = this.getFacet().aggregations;
        if (!aggregationsMap.has("Min")) {
            aggregationsMap.set("Min", new Set<FacetAggregationField>());
        }

        const aggregations = aggregationsMap.get("Min");

        const aggregationField = new FacetAggregationField();
        aggregationField.name = path;
        aggregationField.displayName = displayName;

        aggregations.add(aggregationField);

        return this;
    }

    public maxOn(path: string): IFacetOperations<T>
    public maxOn(path: string, displayName: string): IFacetOperations<T>
    public maxOn(path: string, displayName?: string): IFacetOperations<T> {
        const aggregationsMap = this.getFacet().aggregations;
        if (!aggregationsMap.has("Max")) {
            aggregationsMap.set("Max", new Set<FacetAggregationField>());
        }

        const aggregations = aggregationsMap.get("Max");

        const aggregationField = new FacetAggregationField();
        aggregationField.name = path;
        aggregationField.displayName = displayName;

        aggregations.add(aggregationField);

        return this;
    }

    public averageOn(path: string): IFacetOperations<T>
    public averageOn(path: string, displayName: string): IFacetOperations<T>
    public averageOn(path: string, displayName?: string): IFacetOperations<T> {
        const aggregationsMap = this.getFacet().aggregations;
        if (!aggregationsMap.has("Average")) {
            aggregationsMap.set("Average", new Set<FacetAggregationField>());
        }

        const aggregations = aggregationsMap.get("Average");

        const aggregationField = new FacetAggregationField();
        aggregationField.name = path;
        aggregationField.displayName = displayName;

        aggregations.add(aggregationField);

        return this;
    }

    public getFacet(): FacetBase {
        if (this._default) {
            return this._default;
        }

        return this._range;
    }
}
