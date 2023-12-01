import { InMemoryDocumentSessionOperations } from "../InMemoryDocumentSessionOperations";
import { GetRequest } from "../../Commands/MultiGet/GetRequest";
import { MultiGetCommand } from "../../Commands/MultiGet/MultiGetCommand";

export class MultiGetOperation {
    private readonly _session: InMemoryDocumentSessionOperations;

    public constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }

    public createRequest(requests: GetRequest[]): MultiGetCommand {
        return new MultiGetCommand(
            this._session.requestExecutor, this._session.conventions, requests, this._session.sessionInfo);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public setResult(result: object): void {
    }
}
