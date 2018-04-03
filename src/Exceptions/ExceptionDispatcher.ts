import * as VError from "verror";
import { ExceptionSchema } from "./ExceptionSchema";
import { StatusCodes } from "../Http/StatusCode";
import { RavenErrorType, getError } from "./ClientErrors";
import { HttpResponse } from "../Primitives/Http";

export interface ExceptionDispatcherArgs {
    message: string;
    error?: string;
    type?: string;
}
export class ExceptionDispatcher {

    public static get(opts: ExceptionDispatcherArgs, code: number): Error {
        const { message, error, type } = opts;
        if (code === StatusCodes.Conflict) {
            if (type.indexOf("DocumentConflictException") !== -1) {
                return getError(message, "DocumentConflictException");
            }

            return getError(message, "ConcurrencyException");
        }

        const determinedType = this._getType(type) as RavenErrorType;
        return getError(error, determinedType || "RavenException");
    }

    public static throwException(response: HttpResponse): void {
        if (response === null) {
            throw getError("Response cannot be null", "InvalidArgumentException");
        }

        try {
            const json: string = response.body;
            const schema: ExceptionSchema = JSON.parse(json);

            if (response.statusCode === StatusCodes.Conflict) {
                this._throwConflict(schema, json);
            }

            const determinedType = this._getType(schema.type) as RavenErrorType;
            throw getError(schema.error, determinedType || "RavenException");
        } catch (errThrowing) {
            throw getError(errThrowing.message, "RavenException", errThrowing);
        } finally {
            response.destroy();
        }
    }

    private static _throwConflict(schema: ExceptionSchema, json: string) {
        if (schema.type.includes("DocumentConflictException")) {
            throw getError(schema.message, "DocumentConflictException", null, { json });
        }

        throw getError(schema.message, "ConcurrencyException");
    }


    private static _getType(typeAsString: string): string {
        if ("System.TimeoutException" === typeAsString) {
            return "TimeoutException";
        }
        const prefix = "Raven.Client.Exceptions.";
        if (typeAsString.startsWith(prefix)) {
            const exceptionName = typeAsString.substring(prefix.length);
            if (exceptionName.indexOf(".") !== -1) {
                const tokens = exceptionName.split(".");
                return tokens[tokens.length - 1] as RavenErrorType;
            }

            return exceptionName;
        } else {
            return null;
        }
    }
}