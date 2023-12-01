import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { ModifyDatabaseTopologyResult } from "./ModifyDatabaseTopologyResult";
import { DatabaseTopology } from "./index";
import { throwError } from "../../Exceptions";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { IRaftCommand } from "../../Http/IRaftCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator";
import stream from "readable-stream";

export class ModifyDatabaseTopologyOperation implements IServerOperation<ModifyDatabaseTopologyResult> {
    private readonly _databaseName: string;
    private readonly _databaseTopology: DatabaseTopology;

    public constructor(databaseName: string, databaseTopology: DatabaseTopology) {
        if (!databaseTopology) {
            throwError("InvalidArgumentException", "DatabaseTopology cannot be null")
        }

        this._databaseTopology = databaseTopology;
        this._databaseName = databaseName;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ModifyDatabaseTopologyResult> {
        return new ModifyDatabaseTopologyCommand(this._databaseName, this._databaseTopology);
    }
}

class ModifyDatabaseTopologyCommand extends RavenCommand<ModifyDatabaseTopologyResult> implements IRaftCommand {
    private readonly _databaseName: string;
    private readonly _databaseTopology: DatabaseTopology;

    public constructor(databaseName: string, databaseTopology: DatabaseTopology) {
        super();
        if (!databaseTopology) {
            throwError("InvalidArgumentException", "DatabaseTopology cannot be null")
        }

        this._databaseTopology = databaseTopology;
        this._databaseName = databaseName;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/databases/topology/modify?name=" + this._databaseName;

        const body = this._serializer.serialize(this._databaseTopology);

        return {
            uri,
            method: "POST",
            body,
            headers: this._headers().typeAppJson().build(),
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        let body: string = null;
        this.result = await this._defaultPipeline(_ => body = _)
            .process(bodyStream);
        return body;
    }
}
