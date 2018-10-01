import {InMemoryDocumentSessionOperations} from "../InMemoryDocumentSessionOperations";
import {GetRequest} from "../../Commands/MultiGet/GetRequest";
import {MultiGetCommand} from "../../Commands/MultiGet/MultiGetCommand";

export class MultiGetOperation {
    //TODO: used in lazy execution

    private readonly _session: InMemoryDocumentSessionOperations;

    public constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }

    public createRequest(requests: GetRequest[]): MultiGetCommand {
        return new MultiGetCommand(
            this._session.requestExecutor.cache, this._session.conventions, requests);
    }

    // tslint:disable-next-line:no-empty
    public setResult(result: object): void {
    }
}
