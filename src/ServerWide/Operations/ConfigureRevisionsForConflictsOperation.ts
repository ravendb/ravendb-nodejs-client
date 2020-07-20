import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { RevisionsCollectionConfiguration } from "../../Documents/Operations/RevisionsCollectionConfiguration";
import { throwError } from "../../Exceptions/index";
import { RavenCommand } from "../../Http/RavenCommand";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { IRaftCommand } from "../../Http/IRaftCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "stream";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator";

export class ConfigureRevisionsForConflictsOperation implements IServerOperation<ConfigureRevisionsForConflictsResult> {
    private readonly _database: string;
    private readonly _configuration: RevisionsCollectionConfiguration;

    public constructor(database: string, configuration: RevisionsCollectionConfiguration) {
        this._database = database;
        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }


    getCommand(conventions: DocumentConventions): RavenCommand<ConfigureRevisionsForConflictsResult> {
        return new ConfigureRevisionsForConflictsCommand(conventions, this._database, this._configuration);
    }
}

class ConfigureRevisionsForConflictsCommand extends RavenCommand<ConfigureRevisionsForConflictsResult> implements IRaftCommand {
    private readonly _conventions: DocumentConventions;
    private readonly _databaseName: string;
    private readonly _configuration: RevisionsCollectionConfiguration;

    public constructor(conventions: DocumentConventions, database: string, configuration: RevisionsCollectionConfiguration) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        this._conventions = conventions;

        if (!database) {
            throwError("InvalidArgumentException", "Database cannot be null");
        }

        this._databaseName = database;
        this._configuration = configuration;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + this._databaseName + "/admin/revisions/conflicts/config";

        const body = this._serializer.serialize(this._configuration);

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}

export class ConfigureRevisionsForConflictsResult {
    raftCommandIndex: number;
}