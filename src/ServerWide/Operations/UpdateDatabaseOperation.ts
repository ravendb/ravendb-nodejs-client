import {
    DatabasePutResult,
    DatabaseRecord,
    DocumentConventions,
    IServerOperation,
    OperationResultType,
    RavenCommand
} from "../..";
import { CreateDatabaseCommand } from "./CreateDatabaseOperation";

export class UpdateDatabaseOperation implements IServerOperation<DatabasePutResult> {
    private readonly _databaseRecord: DatabaseRecord;
    private readonly _etag: number;

    public constructor(databaseRecord: DatabaseRecord, etag: number) {
        this._databaseRecord = databaseRecord;
        this._etag = etag;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<DatabasePutResult> {
        return new CreateDatabaseCommand(conventions, this._databaseRecord, 1, this._etag);
    }
}
