export class GroupByField {
    public fieldName: string;
    public projectedName: string;

    public constructor();
    public constructor(fieldName: string);
    public constructor(fieldName: string, projectedName: string);
    public constructor(fieldName?: string, projectedName?: string) {
        this.fieldName = fieldName;
        this.projectedName = projectedName;
    }
}
