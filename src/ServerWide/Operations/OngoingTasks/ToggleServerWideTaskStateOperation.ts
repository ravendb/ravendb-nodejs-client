import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { OngoingTaskType } from "../../../Documents/Operations/OngoingTasks/OngoingTaskType";
import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";

export class ToggleServerWideTaskStateOperation implements IServerOperation<void> {
    private readonly _name: string;
    private readonly _type: OngoingTaskType;
    private readonly _disable: boolean;

    public constructor(name: string, type: OngoingTaskType, disable: boolean) {
        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this._name = name;
        this._type = type;
        this._disable = disable;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new ToggleServerWideTaskStateCommand(this._name, this._type, this._disable);
    }
}

class ToggleServerWideTaskStateCommand extends RavenCommand<any> implements IRaftCommand {
    private readonly _name: string;
    private readonly _type: OngoingTaskType;
    private readonly _disable: boolean;

    public constructor(name: string, type: OngoingTaskType, disable: boolean) {
        super();

        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this._name = name;
        this._type = type;
        this._disable = disable;
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/server-wide/state?type="
            + this._type + "&name=" + this._urlEncode(this._name) + "&disable=" + this._disable;

        return {
            uri,
            method: "POST"
        }
    }
}
