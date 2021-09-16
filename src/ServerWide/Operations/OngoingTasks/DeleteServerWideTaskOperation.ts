import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { OngoingTaskType } from "../../../Documents/Operations/OngoingTasks/OngoingTaskType";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";

export class DeleteServerWideTaskOperation implements IServerOperation<void> {
    private readonly _name: string;
    private readonly _type: OngoingTaskType;

    public constructor(name: string, type: OngoingTaskType) {
        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this._name = name;
        this._type = type;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new DeleteServerWideTaskCommand(this._name, this._type);
    }
}

class DeleteServerWideTaskCommand extends RavenCommand<void> implements IRaftCommand {
    private readonly _name: string;
    private readonly _type: OngoingTaskType;

    public constructor(name: string, type: OngoingTaskType) {
        super();

        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this._name = name;
        this._type = type;
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/configuration/server-wide/task?type=" + this._type + "&name=" + this._urlEncode(this._name);
        return {
            uri,
            method: "DELETE"
        }
    }
}