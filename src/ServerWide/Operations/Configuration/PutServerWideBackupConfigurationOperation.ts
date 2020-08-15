import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { ServerWideBackupConfiguration } from "./ServerWideBackupConfiguration";
import { throwError } from "../../../Exceptions/index";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";

export class PutServerWideBackupConfigurationOperation implements IServerOperation<PutServerWideBackupConfigurationResponse> {
    private readonly _configuration: ServerWideBackupConfiguration;

    public constructor(configuration: ServerWideBackupConfiguration) {
        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._configuration = configuration;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<PutServerWideBackupConfigurationResponse> {
        return new PutServerWideClientConfigurationCommand(this._configuration);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class PutServerWideClientConfigurationCommand extends RavenCommand<PutServerWideBackupConfigurationResponse> implements IRaftCommand {
    private readonly _configuration: ServerWideBackupConfiguration;

    public constructor(configuration: ServerWideBackupConfiguration) {
        super();

        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._configuration = configuration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/server-wide/backup";

        const body = this._serializer.serialize(this._configuration);

        return {
            uri,
            method: "PUT",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }
}

export interface PutServerWideBackupConfigurationResponse {
    name: string;
    raftCommandIndex: number;
}
