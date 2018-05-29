export class CompareExchangeValue<T> {
    public key: string;
    public index: number;
    public value: T;

    public constructor(key: string, index: number, value: T) {
        this.key = key;
        this.index = index;
        this.value = value;
    }
}
