
import { CreateDatabaseCommand } from "./CreateDatabaseOperation";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { DatabasePutResult } from "./index";
import { DatabaseRecord } from "../index";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";

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
