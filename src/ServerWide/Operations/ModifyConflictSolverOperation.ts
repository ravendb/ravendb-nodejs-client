import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";

import { ConflictSolver, ScriptResolver } from "../index";
import { throwError } from "../../Exceptions";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { IRaftCommand } from "../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../Utility/RaftIdGenerator";


export class ModifyConflictSolverOperation implements IServerOperation<ModifySolverResult> {
    private readonly _database: string;
    private readonly _collectionByScript: Record<string, ScriptResolver>;
    private readonly _resolveToLatest: boolean;

    public constructor(database: string)
    public constructor(database: string, collectionByScript: Record<string, ScriptResolver>)
    public constructor(database: string, collectionByScript: Record<string, ScriptResolver>, resolveToLatest: boolean)
    public constructor(database: string, collectionByScript?: Record<string, ScriptResolver>, resolveToLatest?: boolean) {
        this._database = database;
        this._collectionByScript = collectionByScript;
        this._resolveToLatest = resolveToLatest;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ModifySolverResult> {
        return new ModifyConflictSolverCommand(conventions, this._database, this._collectionByScript, this._resolveToLatest);
    }
}

class ModifyConflictSolverCommand extends RavenCommand<ModifySolverResult> implements IRaftCommand {
    private readonly _database: string;
    private readonly _conventions: DocumentConventions;
    private readonly _collectionByScript: Record<string, ScriptResolver>;
    private readonly _resolveToLatest: boolean;

    public constructor(conventions: DocumentConventions, database: string, collectionByScript: Record<string, ScriptResolver>, resolveToLatest: boolean) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!database) {
            throwError("InvalidArgumentException", "Database cannot be null");
        }

        this._database = database;
        this._conventions = conventions;
        this._collectionByScript = collectionByScript;
        this._resolveToLatest = resolveToLatest || false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/replication/conflicts/solver?name=" + encodeURIComponent(this._database);

        const body = this._serializer.serialize({
            ResolveToLatest: this._resolveToLatest,
            ResolveByCollection: this._collectionByScript
        });

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}

export interface ModifySolverResult {
    key: string;
    raftCommandIndex: number;
    solver: ConflictSolver;
}