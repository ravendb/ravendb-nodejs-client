import { QueryToken } from "./QueryToken";

export class IntersectMarkerToken extends QueryToken {

    private constructor() {
        super();
    }

    public static INSTANCE: IntersectMarkerToken = new IntersectMarkerToken();

    public writeTo(writer): void {
        writer.append(",");
    }
}
