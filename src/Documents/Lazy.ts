export class Lazy<T> {

    private _valueFactory: () => Promise<T>;
    private _value: Promise<T>;

    public constructor(valueFactory: () => Promise<T>) {
        this._valueFactory = valueFactory;
    }

    public isValueCreated(): boolean {
        return !!this._value;
    }

    public async getValue(): Promise<T> {
        if (this._value) {
            return this._value;
        }

        this._value = this._valueFactory();
        return this._value;
    }
}
