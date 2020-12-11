import { QueryToken } from "./QueryToken";
import * as os from "os";

export class DeclareToken extends QueryToken {

    private _name: string;
    private _parameters: string;
    private _body: string;
    private _timeSeries: boolean;

    private constructor(name: string, body: string, parameters: string, timeSeries: boolean) {
        super();

        this._name = name;
        this._body = body;
        this._parameters = parameters;
        this._timeSeries = timeSeries;
    }

    public static createFunction(name: string, body: string): DeclareToken;
    public static createFunction(name: string, body: string, parameters: string): DeclareToken;
    public static createFunction(name: string, body: string, parameters: string = null): DeclareToken {
        return new DeclareToken(name, body, parameters, false);
    }

    public static createTimeSeries(name: string, body: string): DeclareToken;
    public static createTimeSeries(name: string, body: string, parameters: string): DeclareToken;
    public static createTimeSeries(name: string, body: string, parameters: string = null): DeclareToken {
        return new DeclareToken(name, body, parameters, true);
    }

    public writeTo(writer): void {
        writer
            .append("declare ")
            .append(this._timeSeries ? "timeseries " : "function ")
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
