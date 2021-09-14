
import { CreateDatabaseCommand } from "./CreateDatabaseOperation";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { DatabasePutResult } from "./index";
import { DatabaseRecord } from "../index";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";

export class UpdateDatabaseOperation implements IServerOperation<DatabasePutResult> {
    private readonly _databaseRecord: DatabaseRecord;
    private readonly _etag: number;
    private readonly _replicationFactor: number;

    public constructor(databaseRecord: DatabaseRecord, etag: number, replicationFactor?: number) {
        this._databaseRecord = databaseRecord;
        this._etag = etag;
        const topology = databaseRecord.topology;

        if (replicationFactor) {
            this._replicationFactor = replicationFactor;
        } else {
            if (topology && topology.replicationFactor > 0) {
                this._replicationFactor = topology.replicationFactor;
            } else {
                throwError("InvalidArgumentException", "DatabaseRecord.Topology.ReplicationFactor is missing");
            }
        }
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<DatabasePutResult> {
        return new CreateDatabaseCommand(conventions, this._databaseRecord, this._replicationFactor, this._etag);
    }
}
