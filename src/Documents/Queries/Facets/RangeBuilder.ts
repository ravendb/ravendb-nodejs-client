import { throwError } from "../../../Exceptions";

export class RangeBuilder<T = any> {
    private _path: string;
    private _lessBound: T;
    private _greaterBound: T;
    private _lessInclusive: boolean;
    private _greaterInclusive: boolean;
    private _lessSet: boolean = false;
    private _greaterSet: boolean = false;

    public constructor(path: string) {
        this._path = path;
    }

    public static forPath<T>(path: string): RangeBuilder<T> {
        return new RangeBuilder<T>(path);
    }

    private _createClone(): RangeBuilder<T> {
        const builder = new RangeBuilder<T>(this._path);
        builder._lessBound = this._lessBound;
        builder._greaterBound = this._greaterBound;
        builder._lessInclusive = this._lessInclusive;
        builder._greaterInclusive = this._greaterInclusive;
        builder._lessSet = this._lessSet;
        builder._greaterSet = this._greaterSet;
        return builder;
    }

    public isLessThan(value: T): RangeBuilder<T> {
        if (this._lessSet) {
            throwError("InvalidOperationException", "Less bound was already set");
        }

        const clone = this._createClone();
        clone._lessBound = value;
        clone._lessInclusive = false;
        clone._lessSet = true;
        return clone;
    }

    public isLessThanOrEqualTo(value: T): RangeBuilder<T> {
        if (this._lessSet) {
            throwError("InvalidOperationException", "Less bound was already set");
        }

        const clone = this._createClone();
        clone._lessBound = value;
        clone._lessInclusive = true;
        clone._lessSet = true;
        return clone;
    }

    public isGreaterThan(value: T): RangeBuilder<T> {
        if (this._greaterSet) {
            throwError("InvalidOperationException", "Greater bound was already set");
        }

        const clone = this._createClone();
        clone._greaterBound = value;
        clone._greaterInclusive = false;
        clone._greaterSet = true;
        return clone;
    }

    public isGreaterThanOrEqualTo(value: T): RangeBuilder<T> {
        if (this._greaterSet) {
            throwError("InvalidOperationException", "Greater bound was already set");
        }

        const clone = this._createClone();
        clone._greaterBound = value;
        clone._greaterInclusive = true;
        clone._greaterSet = true;
        return clone;
    }

    public getStringRepresentation(addQueryParameter: (o: object) => string): string {
        let less: string = null;
        let greater: string = null;
        if (!this._lessSet && !this._greaterSet) {
            throwError("InvalidOperationException", "Bounds were not set");
        }

        if (this._lessSet) {
            const lessParamName = addQueryParameter.apply(this._lessBound);
            less = this._path + (this._lessInclusive ? " <= " : " < ") + "$" + lessParamName;
        }

        if (this._greaterSet) {
            const greaterParamName = addQueryParameter.apply(this._greaterBound);
            greater = this._path + (this._greaterInclusive ? " >= " : " > ") + "$" + greaterParamName;
        }

        if (less && greater) {
            return greater + " and " + less;
        }
        return less || greater;
    }
}