import { OperationCompletionAwaiter } from "../../Documents/Operations/OperationCompletionAwaiter";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { GetServerWideOperationStateCommand } from "./GetServerWideOperationStateOperation";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { KillServerOperationCommand } from "../../Documents/Commands/KillServerOperationCommand";

export class ServerWideOperationCompletionAwaiter extends OperationCompletionAwaiter {

    public constructor(requestExecutor: RequestExecutor, conventions: DocumentConventions, id: number, nodeTag?: string) {
        super(requestExecutor, conventions, id);

        this.nodeTag = nodeTag;
    }

    protected _getOperationStateCommand(conventions: DocumentConventions, id: number, nodeTag?: string): RavenCommand<IRavenResponse> {
        return new GetServerWideOperationStateCommand(id, nodeTag);
    }

    protected _getKillOperationCommand(id: number, nodeTag: string): RavenCommand<void> {
        return new KillServerOperationCommand(id, nodeTag);
    }
}
