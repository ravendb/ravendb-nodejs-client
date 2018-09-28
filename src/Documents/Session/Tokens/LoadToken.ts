import { QueryToken } from "./QueryToken";

export class LoadToken extends QueryToken {

    public argument: string;
    public alias: string;

    private constructor(argument: string, alias: string) {
        super();
        this.argument = argument;
        this.alias = alias;
    }

    public static create(argument: string, alias: string): LoadToken  {
        return new LoadToken(argument, alias);
    }

    public writeTo(writer): void {
        writer
                .append(this.argument)
                .append(" as ")
                .append(this.alias);
    }
}
