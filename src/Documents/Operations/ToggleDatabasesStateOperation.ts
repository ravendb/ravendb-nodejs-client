import { IServerOperation, OperationResultType } from "./OperationAbstractions";
import { DisableDatabaseToggleResult } from "./DisableDatabaseToggleResult";
import { TypeUtil } from "../../Utility/TypeUtil";
import { throwError } from "../../Exceptions";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";

export class ToggleDatabasesStateOperation implements IServerOperation<DisableDatabaseToggleResult> {
    private readonly _disable: boolean;
    private readonly _parameters: ToggleDatabasesStateParameters;

    public constructor(databaseName: string, disable: boolean)
    public constructor(databaseNames: string[], disable: boolean)
    public constructor(parameters: ToggleDatabasesStateParameters, disable: boolean)
    public constructor(databaseOrParameters: string | string[] | ToggleDatabasesStateParameters, disable: boolean) {
        this._disable = disable;

        if (!databaseOrParameters) {
            throwError("InvalidArgumentException", "Databases cannot be null");
        }

        if (TypeUtil.isString(databaseOrParameters)) {
            this._parameters = {
                databaseNames: [databaseOrParameters]
            };
        } else if (TypeUtil.isArray<string>(databaseOrParameters)) {
            this._parameters = {
                databaseNames: databaseOrParameters
            }
        } else {
            this._parameters = {
                databaseNames: databaseOrParameters.databaseNames
            }
        }

        if (!this._parameters.databaseNames || !this._parameters.databaseNames.length) {
            throwError("InvalidArgumentException", "Please provide at least one database name");
        }
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<DisableDatabaseToggleResult> {
        return new ToggleDatabaseStateCommand(conventions, this._parameters, this._disable);
    }
}

class ToggleDatabaseStateCommand extends RavenCommand<DisableDatabaseToggleResult> {
    private readonly _disable: boolean;
    private readonly _parameters: ToggleDatabasesStateParameters;

    public constructor(conventions: DocumentConventions, parameters: ToggleDatabasesStateParameters, disable: boolean) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null");
        }

        this._disable = disable;
        this._parameters = parameters;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const toggle = this._disable ? "disable" : "enable";

        const uri = node.url + "/admin/databases/" + toggle;

        const body = this._serializer.serialize(this._parameters);

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        const results = await this._defaultPipeline(_ => body = _).process(bodyStream);

        const status = results["status"] as DisableDatabaseToggleResult[];
        if (!TypeUtil.isArray(status)) {
            this._throwInvalidResponse();
        }

        this.result = status[0];

        return body;
    }
}

export interface ToggleDatabasesStateParameters {
    databaseNames: string[];
}