import { OperationCompletionAwaiter } from "../../Documents/Operations/OperationCompletionAwaiter";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { GetServerWideOperationStateCommand } from "./GetServerWideOperationStateOperation";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";

export class ServerWideOperationCompletionAwaiter extends OperationCompletionAwaiter {

    public constructor(requestExecutor: RequestExecutor, conventions: DocumentConventions, id: number) {
        super(requestExecutor, conventions, id);
    }

    protected _getOperationStateCommand(conventions: DocumentConventions, id: number): RavenCommand<IRavenResponse> {
        return new GetServerWideOperationStateCommand(conventions, id);
    }
}
