import {QueryToken} from "./QueryToken";

export class NegateToken extends QueryToken {
    private constructor() {
        super();
    }

    public static INSTANCE: NegateToken = new NegateToken();

    public writeTo(writer) {
        writer.append("not");
    }
}
