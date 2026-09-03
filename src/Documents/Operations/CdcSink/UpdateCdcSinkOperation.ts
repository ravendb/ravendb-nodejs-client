import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { UpdateCdcSinkOperationResult } from "./UpdateCdcSinkOperationResult.js";
import { CdcSinkConfiguration } from "./CdcSinkConfiguration.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { Stream } from "node:stream";

export class UpdateCdcSinkOperation implements IMaintenanceOperation<UpdateCdcSinkOperationResult> {
    private readonly _taskId: number;
    private readonly _configuration: CdcSinkConfiguration;

    constructor(taskId: number, configuration: CdcSinkConfiguration) {
        this._taskId = taskId;
        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<UpdateCdcSinkOperationResult> {
        return new UpdateCdcSinkCommand(conventions, this._taskId, this._configuration);
    }
}

class UpdateCdcSinkCommand extends RavenCommand<UpdateCdcSinkOperationResult> implements IRaftCommand {
    private readonly _taskId: number;
    private readonly _configuration: CdcSinkConfiguration;
    private readonly _conventions: DocumentConventions;

    constructor(conventions: DocumentConventions, taskId: number, configuration: CdcSinkConfiguration) {
        super();
        this._taskId = taskId;
        this._configuration = configuration;
        this._conventions = conventions;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/cdc-sink?id=" + this._taskId;

        const headers = this._headers().typeAppJson().build();
        const body = this._serializer.serialize(this._configuration);

        return {
            method: "PUT",
            uri,
            body,
            headers
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
