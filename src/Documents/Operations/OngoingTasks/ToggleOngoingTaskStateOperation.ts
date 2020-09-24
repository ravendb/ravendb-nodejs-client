import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { OngoingTaskType } from "./OngoingTaskType";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { ModifyOngoingTaskResult } from "../../../ServerWide/ModifyOnGoingTaskResult";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class ToggleOngoingTaskStateOperation implements IMaintenanceOperation<ModifyOngoingTaskResult> {
    private readonly _taskId: number;
    private readonly _taskName: string;
    private readonly _type: OngoingTaskType;
    private readonly _disable: boolean;

    public constructor(taskId: number, type: OngoingTaskType, disable: boolean)
    public constructor(taskName: string, type: OngoingTaskType, disable: boolean)
    public constructor(taskNameOrTaskId: number | string, type: OngoingTaskType, disable: boolean) {
        if (TypeUtil.isString(taskNameOrTaskId)) {
            this._taskId = 0;
            this._taskName = taskNameOrTaskId;
        } else {
            this._taskId = taskNameOrTaskId;
            this._taskName = null;
        }

        this._type = type;
        this._disable = disable;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<ModifyOngoingTaskResult> {
        return new ToggleTaskStateCommand(this._taskId, this._taskName, this._type, this._disable);
    }
}

class ToggleTaskStateCommand extends RavenCommand<ModifyOngoingTaskResult> implements IRaftCommand {
    private readonly _taskId: number;
    private readonly _taskName: string;
    private readonly _type: OngoingTaskType;
    private readonly _disable: boolean;

    public constructor(taskId: number, taskName: string, type: OngoingTaskType, disable: boolean) {
        super();

        this._taskId = taskId;
        this._taskName = taskName;
        this._type = type;
        this._disable = disable;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/"
            + node.database + "/admin/tasks/state?key="
            + this._taskId + "&type=" + this._type
            + "&disable=" + (this._disable ? "true" : "false");

        if (this._taskName) {
            uri += "&taskName=" + encodeURIComponent(this._taskName);
        }

        return {
            uri,
            method: "POST"
        };
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (bodyStream) {
            return this._parseResponseDefaultAsync(bodyStream);
        }

        return null;
    }

    get isReadRequest(): boolean {
        return false;
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
