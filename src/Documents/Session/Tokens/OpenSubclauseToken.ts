import { QueryToken } from "./QueryToken";

export class OpenSubclauseToken extends QueryToken {
    private constructor() {
        super();
    }

    public boostParameterName: string;

    public static create(): OpenSubclauseToken {
        return new OpenSubclauseToken();
    }

    public writeTo(writer) {
        if (this.boostParameterName) {
            writer.append("boost");
        }
        writer.append("(");
    }
}
