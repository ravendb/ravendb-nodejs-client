import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { ClientConfiguration } from "../../../Documents/Operations/Configuration/ClientConfiguration";
import { ServerNode } from "../../../Http/ServerNode";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class PutServerWideClientConfigurationOperation implements IServerOperation<void> {
    private readonly _configuration: ClientConfiguration;

    public constructor(configuration: ClientConfiguration) {
        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new PutServerWideClientConfigurationCommand(conventions, this._configuration);
    }
}

class PutServerWideClientConfigurationCommand extends RavenCommand<void> implements IRaftCommand {
    private readonly _configuration: ClientConfiguration;

    public constructor(conventions: DocumentConventions, configuration: ClientConfiguration) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._configuration = configuration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/client";

        const body = this._serializer.serialize(this._configuration);

        return {
            uri,
            method: "PUT",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}