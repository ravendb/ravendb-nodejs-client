import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { DatabaseRecordWithEtag } from "..";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { QueryResult } from "../../Documents/Queries/QueryResult";

export class GetDatabaseRecordOperation implements IServerOperation<DatabaseRecordWithEtag> {
    private readonly _database: string;

    public constructor(database: string) {
        this._database = database;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<DatabaseRecordWithEtag> {
        return new GetDatabaseRecordCommand(conventions, this._database);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class GetDatabaseRecordCommand extends RavenCommand<DatabaseRecordWithEtag> {
    private readonly _conventions: DocumentConventions;
    private readonly _database: string;

    public constructor(conventions: DocumentConventions, database: string) {
        super();

        this._conventions = conventions;
        this._database = database;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/databases?name=" + this._database;
        return {
            method: "GET",
            uri
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        this.result = await this._defaultPipeline(_ => body = _)
            .collectBody()
            .objectKeysTransform({
                defaultTransform: "camel",
                ignorePaths: [
                    /^(indexes|sorters|autoIndexes|settings|indexesHistory|ravenConnectionStrings|sqlConnectionStrings)\.[^.]+$/i
                ]
            })
            .process(bodyStream);

        const history = this.result.indexesHistory;
        if (history) {
            for (const indexName of Object.keys(history)) {
                const indexHistory = history[indexName];

                history[indexName] = indexHistory.map(item => this._conventions.objectMapper.fromObjectLiteral(item, {
                    nestedTypes: {
                        createdAt: "date"
                    }
                }));
            }
        }


        return body;
    }
}
