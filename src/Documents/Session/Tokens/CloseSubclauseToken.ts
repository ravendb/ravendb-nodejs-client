import { QueryToken } from "./QueryToken";

export class CloseSubclauseToken extends QueryToken {

    public boostParameterName: string;

    private constructor() {
        super();
    }

    public static create(): CloseSubclauseToken {
        return new CloseSubclauseToken();
    }

    public writeTo(writer): void {
        if (this.boostParameterName) {
            writer
                .append(", $")
                .append(this.boostParameterName);
        }
        writer.append(")");
    }
}
