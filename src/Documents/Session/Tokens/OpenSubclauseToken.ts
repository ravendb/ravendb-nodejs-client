import { QueryToken } from "./QueryToken";

export class OpenSubclauseToken extends QueryToken {
    private constructor() {
        super();
    }

    public static INSTANCE = new OpenSubclauseToken();

    public writeTo(writer) {
        writer.append("(");
    }
}
