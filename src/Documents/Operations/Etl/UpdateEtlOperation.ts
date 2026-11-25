import { ConnectionString } from "./ConnectionString.js";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { EtlConfiguration } from "./EtlConfiguration.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";

export class UpdateEtlOperation<T extends ConnectionString> implements IMaintenanceOperation<UpdateEtlOperationResult> {
    private readonly _taskId: number;
    private readonly _configuration: EtlConfiguration<T>;
    private readonly _transformationsToReset: string[];

    public constructor(taskId: number, configuration: EtlConfiguration<T>, transformationsToReset?: string[]) {
        this._taskId = taskId;
        this._configuration = configuration;
        this._transformationsToReset = transformationsToReset;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<UpdateEtlOperationResult> {
        return new UpdateEtlCommand(conventions, this._taskId, this._configuration, this._transformationsToReset);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class UpdateEtlCommand<T extends ConnectionString> extends RavenCommand<UpdateEtlOperationResult>
    implements IRaftCommand {

    private readonly _conventions: DocumentConventions;
    private readonly _taskId: number;
    private readonly _configuration: EtlConfiguration<T>;
    private readonly _transformationsToReset: string[];

    public constructor(conventions: DocumentConventions, taskId: number, configuration: EtlConfiguration<T>,
                       transformationsToReset: string[]) {
        super();

        this._conventions = conventions;
        this._taskId = taskId;
        this._configuration = configuration;
        this._transformationsToReset = transformationsToReset;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/" + node.database + "/admin/etl?id=" + this._taskId;
        for (const transformation of this._transformationsToReset ?? []) {
            uri += "&reset=" + encodeURIComponent(transformation);
        }

        const body = this._serializer.serialize(this._configuration.serialize(this._conventions));
        const headers = this._headers().typeAppJson().build();

        return {
            uri,
            method: "PUT",
            headers,
            body
        }
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}

interface UpdateEtlOperationResult {
    raftCommandIndex: number;
    taskId: number;
}