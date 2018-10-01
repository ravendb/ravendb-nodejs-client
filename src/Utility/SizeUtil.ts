export class Size {
    private _sizeInBytes: number;
    private _humaneSize: string;

    public get sizeInBytes(): number {
        return this._sizeInBytes;
    }

    public get humaneSize(): string {
        return this._humaneSize;
    }

    public set sizeInBytes(value: number) {
        this._sizeInBytes = value;
    }

    public set humaneSize(value: string) {
        this._humaneSize = value;
    }
}
