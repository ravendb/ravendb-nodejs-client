import { QueryToken } from "./QueryToken";

export class CloseSubclauseToken extends QueryToken {
    private constructor() {
        super();
    }

    public static INSTANCE: CloseSubclauseToken = new CloseSubclauseToken();

    public writeTo(writer): void {
        writer.append(")");
    }
}
