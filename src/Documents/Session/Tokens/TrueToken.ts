import { QueryToken } from "./QueryToken";

export class TrueToken extends QueryToken {

    private constructor() {
        super();
    }

    public static INSTANCE: TrueToken = new TrueToken();

    public writeTo(writer) {
        writer.append("true");
    }
}
