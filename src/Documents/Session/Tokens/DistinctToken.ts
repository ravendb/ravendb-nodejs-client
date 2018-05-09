import { QueryToken } from "./QueryToken";

export class DistinctToken extends QueryToken {

    private constructor() {
        super();
    }

    public static INSTANCE: DistinctToken  = new DistinctToken();

    public writeTo(writer): void {
        writer.append("distinct");
    }
}
