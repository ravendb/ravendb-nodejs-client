import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { OngoingTaskType } from "./OngoingTaskType";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class ToggleOngoingTaskStateOperation implements IMaintenanceOperation<void> {
    private readonly _taskId: number;
    private readonly _type: OngoingTaskType;
    private readonly _disable: boolean;

    public constructor(taskId: number, type: OngoingTaskType, disable: boolean) {
        this._taskId = taskId;
        this._type = type;
        this._disable = disable;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new ToggleTaskStateCommand(this._taskId, this._type, this._disable);
    }
}

class ToggleTaskStateCommand extends RavenCommand<void> {
    private readonly _taskId: number;
    private readonly _type: OngoingTaskType;
    private readonly _disable: boolean;

    public constructor(taskId: number, type: OngoingTaskType, disable: boolean) {
        super();

        this._taskId = taskId;
        this._type = type;
        this._disable = disable;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/tasks/state?key="
            + this._taskId + "&type=" + this._type + "&disable=" + (this._disable ? "true" : "false");

        return {
            uri,
            method: "POST"
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (bodyStream) {
            // TODO: result = mapper.readValue(response, ModifyOngoingTaskResult.class);
        }

        return null; //TODO:
    }

    get isReadRequest(): boolean {
        return false;
    }

}
