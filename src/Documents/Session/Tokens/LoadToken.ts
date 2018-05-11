import { QueryToken } from "./QueryToken";

export class LoadToken extends QueryToken {

    private _argument: string;
    private _alias: string;

    private constructor(argument: string, alias: string) {
        super();
        this._argument = argument;
        this._alias = alias;
    }

    public static create(argument: string, alias: string): LoadToken  {
        return new LoadToken(argument, alias);
    }

    public writeTo(writer): void {
        writer
                .append(this._argument)
                .append(" as ")
                .append(this._alias);
    }
}
