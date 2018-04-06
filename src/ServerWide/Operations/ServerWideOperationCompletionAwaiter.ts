import { OperationCompletionAwaiter } from "../../Documents/Operations/OperationCompletionAwaiter";
import { RequestExecutor, DocumentConventions } from "../..";
import { RavenCommand } from "../../Http/RavenCommand";
import { IRavenResponse } from "../../Types";
import { GetServerWideOperationStateCommand } from "./GetServerWideOperationStateOperation";

export class ServerWideOperationCompletionAwaiter extends OperationCompletionAwaiter {

    public constructor(requestExecutor: RequestExecutor, conventions: DocumentConventions, id: number) {
        super(requestExecutor, conventions, id);
    }

    protected _getOperationStateCommand(conventions: DocumentConventions, id: number): RavenCommand<IRavenResponse> {
        return new GetServerWideOperationStateCommand(conventions, id);
    }
}
