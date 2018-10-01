import {DynamicSpatialField} from "./DynamicSpatialField";

export class WktField extends DynamicSpatialField {
    public wkt: string;

    public constructor(wkt: string) {
        super();
        this.wkt = wkt;
    }

    public toField(ensureValidFieldName: (fieldName: string, isNestedPath: boolean) => string): string {
        return "spatial.wkt(" + ensureValidFieldName(this.wkt, false) + ")";
    }
}
