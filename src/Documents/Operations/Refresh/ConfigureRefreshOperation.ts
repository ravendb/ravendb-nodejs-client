import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { RefreshConfiguration } from "./RefreshConfiguration";
import { ConfigureRefreshOperationResult } from "./ConfigureRefreshOperationResult";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { throwError } from "../../../Exceptions";

export class ConfigureRefreshOperation implements IMaintenanceOperation<ConfigureRefreshOperationResult> {
    private readonly _configuration: RefreshConfiguration;

    public constructor(configuration: RefreshConfiguration) {
        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }
        this._configuration = configuration;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ConfigureRefreshOperationResult> {
        return new ConfigureRefreshCommand(this._configuration);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class ConfigureRefreshCommand extends RavenCommand<ConfigureRefreshOperationResult> implements IRaftCommand {
    private readonly _configuration: RefreshConfiguration;

    public constructor(configuration: RefreshConfiguration) {
        super();

        this._configuration = configuration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/refresh/config";

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

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

}