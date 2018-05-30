import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { ClientConfiguration } from "./ClientConfiguration";
import { throwError } from "../../../Exceptions";
import { RavenCommand, RavenCommandResponseType } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../..";
import { HttpRequestBase } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";

export class PutClientConfigurationOperation implements IMaintenanceOperation<void> {
    private configuration: ClientConfiguration;

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

    public constructor(configuration: ClientConfiguration) {

        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null or undefined.");
        }

        this.configuration = configuration;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new PutClientConfigurationCommand(conventions, this.configuration);
    }

}

export class PutClientConfigurationCommand extends RavenCommand<void> {
    private _configuration: string;

    public get isReadRequest() {
        return false;
    }

    public get responseType(): RavenCommandResponseType {
        return "Empty";
    }

    public constructor(conventions: DocumentConventions, configuration: ClientConfiguration) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Document conventions cannot be null or undefined.");
        }

        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null or undefined.");
        }

        this._configuration = this._serializer.serialize(configuration);
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = `${node.url}/databases/${node.database}/admin/configuration/client`;
        return {
            method: "PUT",
            uri,
            body: this._configuration,
            headers: {
                "content-type": "application/json"
            }
        };
    }
}
