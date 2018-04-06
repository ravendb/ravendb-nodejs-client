import { HttpRequestBase } from "../../Primitives/Http";
import { DatabaseRecord } from "..";
import { RavenCommand } from "../../Http/RavenCommand";
import { DatabasePutResult } from ".";
import { DocumentConventions } from "../..";
import { throwError } from "../../Exceptions/ClientErrors";
import { ServerNode } from "../../Http/ServerNode";
import { IServerOperation } from "./IServerOperation";

export class CreateDatabaseOperation implements IServerOperation<DatabasePutResult> {

    private _databaseRecord: DatabaseRecord;
    private _replicationFactor: number;

    public constructor(databaseRecord: DatabaseRecord, replicationFactor = 1) {
        this._databaseRecord = databaseRecord;
        this._replicationFactor = replicationFactor;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<DatabasePutResult> {
        return new CreateDatabaseCommand(conventions, this._databaseRecord, this._replicationFactor);
    }
}

class CreateDatabaseCommand extends RavenCommand<DatabasePutResult> {
    private _conventions: DocumentConventions;
    private _databaseRecord: DatabaseRecord;
    private _replicationFactor: number;
    private _databaseName: string;

    public constructor(conventions: DocumentConventions, databaseRecord: DatabaseRecord, replicationFactor: number) {
        super();
        this._conventions = conventions;
        this._databaseRecord = databaseRecord;
        this._replicationFactor = replicationFactor;

        if (!databaseRecord || !databaseRecord.databaseName) {
            throwError("Database name is required", "InvalidOperationException");
        }

        this._databaseName = databaseRecord.databaseName;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        let uri = node.url + "/admin/databases?name=" + this._databaseName;

        uri += "&replicationFactor=" + this._replicationFactor;

        const databaseDocument = JSON.stringify(this._databaseRecord);
        return {
            uri,
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            }
        };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this.throwInvalidResponse();
        }

        this.result = this.mapper.deserialize(response);
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
