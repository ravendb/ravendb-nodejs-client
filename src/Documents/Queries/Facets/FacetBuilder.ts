import { IFacetBuilder } from "./IFacetBuilder";
import { IFacetOperations } from "./IFacetOperations";
import { GenericRangeFacet } from "./GenericRangeFacet";
import { Facet } from "./Facet";
import { RangeBuilder } from "./RangeBuilder";
import { throwError } from "../../../Exceptions";
import { FacetOptions } from ".";
import { FacetBase } from "./FacetBase";

export class FacetBuilder<T> implements IFacetBuilder<T>, IFacetOperations<T> {
    private _range: GenericRangeFacet;
    private _default: Facet;

    private static _rqlKeywords: Set<String> = new Set([
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

    public byField(fieldName: string): IFacetOperations<T> {
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

    public sumOn(path: string): IFacetOperations<T> {
        this.getFacet().aggregations.set("Sum", path);
        return this;
    }

    public minOn(path: string): IFacetOperations<T> {
        this.getFacet().aggregations.set("Min", path);
        return this;
    }

    public maxOn(path: string): IFacetOperations<T> {
        this.getFacet().aggregations.set("Max", path);
        return this;
    }

    public averageOn(path: string): IFacetOperations<T> {
        this.getFacet().aggregations.set("Average", path);
        return this;
    }

    public getFacet(): FacetBase {
        if (this._default) {
            return this._default;
        }

        return this._range;
    }
}
