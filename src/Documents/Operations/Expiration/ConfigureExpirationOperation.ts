import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { ExpirationConfiguration } from "./ExpirationConfiguration";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class ConfigureExpirationOperation implements IMaintenanceOperation<ConfigureExpirationOperationResult> {
    private readonly _configuration: ExpirationConfiguration;

    public constructor(configuration: ExpirationConfiguration) {
        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ConfigureExpirationOperationResult> {
        return new ConfigureExpirationCommand(this._configuration);
    }
}

class ConfigureExpirationCommand extends RavenCommand<ConfigureExpirationOperationResult> {
    private readonly _configuration: ExpirationConfiguration;

    public constructor(configuration: ExpirationConfiguration) {
        super();

        this._configuration = configuration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/expiration/config";

        const body = this._serializer.serialize(this._configuration);

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}

export interface ConfigureExpirationOperationResult {
    raftCommandIndex: number;
}