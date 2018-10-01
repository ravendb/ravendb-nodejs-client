import {QueryToken} from "./QueryToken";
import * as os from "os";

export class DeclareToken extends QueryToken {

    private _name: string;
    private _parameters: string;
    private _body: string;

    private constructor(name: string, body: string, parameters: string) {
        super();

        this._name = name;
        this._body = body;
        this._parameters = parameters;
    }

    public static create(name: string, body: string): DeclareToken;
    public static create(name: string, body: string, parameters: string): DeclareToken;
    public static create(name: string, body: string, parameters: string = null): DeclareToken {
        return new DeclareToken(name, body, parameters);
    }

    public writeTo(writer): void {
        writer
            .append("declare ")
            .append("function ")
            .append(this._name)
            .append("(")
            .append(this._parameters)
            .append(") ")
            .append("{")
            .append(os.EOL)
            .append(this._body)
            .append(os.EOL)
            .append("}")
            .append(os.EOL);
    }
}
