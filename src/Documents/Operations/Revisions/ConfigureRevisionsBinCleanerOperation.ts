import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { RevisionsBinConfiguration } from "./RevisionsBinConfiguration.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { throwError } from "../../../Exceptions/index.js";

export class ConfigureRevisionsBinCleanerOperation implements IMaintenanceOperation<ConfigureRevisionsBinCleanerOperationResult> {
    private readonly _configuration: RevisionsBinConfiguration;

    public constructor(configuration: RevisionsBinConfiguration) {
        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }
        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<ConfigureRevisionsBinCleanerOperationResult> {
        return new ConfigureRevisionsBinCleanerCommand(this._configuration);
    }
}

class ConfigureRevisionsBinCleanerCommand extends RavenCommand<ConfigureRevisionsBinCleanerOperationResult> implements IRaftCommand {
    private readonly _configuration: RevisionsBinConfiguration;

    public constructor(configuration: RevisionsBinConfiguration) {
        super();
        this._configuration = configuration;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/revisions/bin-cleaner/config";

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body: this._serializer.serialize(this._configuration)
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}

export interface ConfigureRevisionsBinCleanerOperationResult {
    raftCommandIndex: number;
}
