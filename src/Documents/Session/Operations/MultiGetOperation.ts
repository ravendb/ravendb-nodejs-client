import { InMemoryDocumentSessionOperations } from "../InMemoryDocumentSessionOperations";
import { GetRequest } from "../../Commands/MultiGet/GetRequest";
import { MultiGetCommand } from "../../Commands/MultiGet/MultiGetCommand";

export class MultiGetOperation {
    //TBD: used in lazy execution
    
    private readonly _session: InMemoryDocumentSessionOperations;
     public constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }
     public createRequest(requests: GetRequest[]): MultiGetCommand {
        return new MultiGetCommand(
            this._session.requestExecutor.cache, this._session.conventions, requests);
    }
    
    public setResult(result: object): void {}
}
