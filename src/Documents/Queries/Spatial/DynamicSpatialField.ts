export abstract class DynamicSpatialField {

    public roundFactor: number;

    public abstract toField(ensureValidFieldName: (fieldName: string, isNestedPath: boolean) => string): string;

    public roundTo(factor: number) {
        this.roundFactor = factor;
        return this;
    }
}
