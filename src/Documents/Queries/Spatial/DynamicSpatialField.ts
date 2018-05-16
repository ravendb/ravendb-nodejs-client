export abstract class DynamicSpatialField {
    public abstract toField(ensureValidFieldName: (fieldName: string, isNestedPath: boolean) => string): string;
}
