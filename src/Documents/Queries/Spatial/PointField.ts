import { DynamicSpatialField } from "./DynamicSpatialField";

export class PointField extends DynamicSpatialField {
    public latitude: string;
    public longitude: string;

    public constructor(latitude: string, longitude: string) {
        super();

        this.latitude = latitude;
        this.longitude = longitude;
    }

    public toField(ensureValidFieldName: (fieldName: string, isNestedPath: boolean) => string): string {
        return "spatial.point(" +
            ensureValidFieldName(this.latitude, false) + ", " + ensureValidFieldName(this.longitude, false) + ")";
    }
}
