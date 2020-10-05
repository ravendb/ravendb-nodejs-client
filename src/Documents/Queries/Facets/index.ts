export type FacetTermSortMode =
    "ValueAsc"
    | "ValueDesc"
    | "CountAsc"
    | "CountDesc";

export type FacetAggregation =
    "None"
    | "Max"
    | "Min"
    | "Average"
    | "Sum";

export interface IFacetValue {
    name: string;
    range: string;
    count: number;
    sum: number;
    max: number;
    min: number;
    average: number;
}

export class FacetValue implements IFacetValue {

    public name: string;
    public range: string;
    public count: number;
    public sum: number;
    public max: number;
    public min: number;
    public average: number;

    public toString() {
        return FacetValue.toString(this);
    }

    public static toString(facetVal: IFacetValue) {
        let msg = facetVal.range + " - Count: " + facetVal.count + ", ";
        if (facetVal.sum) {
            msg += "Sum: " + facetVal.sum + ",";
        }
        if (facetVal.max) {
            msg += "Max: " + facetVal.max + ",";
        }
        if (facetVal.min) {
            msg += "Min: " + facetVal.min + ",";
        }
        if (facetVal.average) {
            msg += "Average: " + facetVal.average + ",";
        }
        if (facetVal.name) {
            msg += "Name: " + facetVal.name + ",";
        }

        return msg.replace(/;$/, "");
    }
}

export class FacetResult {

    public name: string;

    /**
     * The facet terms and hits up to a limit of MaxResults items (as specified in the facet setup document), sorted
     * in TermSortMode order (as indicated in the facet setup document).
     */
    public values: FacetValue[] = [];

    /**
     * A list of remaining terms in term sort order for terms that are outside of the MaxResults count.
     */
    public remainingTerms: string[] = [];

    /**
     * The number of remaining terms outside of those covered by the Values terms.
     */
    public remainingTermsCount: number;

    public remainingHits: number;
}

export interface IFacetOptions {
    termSortMode: FacetTermSortMode;
    includeRemainingTerms: boolean;
    start: number;
    pageSize: number;
}

export class FacetOptions implements IFacetOptions {
    public termSortMode: FacetTermSortMode;
    public includeRemainingTerms: boolean;
    public start: number;
    public pageSize: number;

    private static _defaultOptions = new FacetOptions();

    public static getDefaultOptions(): IFacetOptions {
        return this._defaultOptions;
    }
}
