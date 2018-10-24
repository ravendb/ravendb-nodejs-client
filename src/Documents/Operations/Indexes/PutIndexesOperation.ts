import { JsonSerializer } from "../../../Mapping/Json/Serializer";
import { IMaintenanceOperation } from "../OperationAbstractions";
import { IndexDefinition } from "../../Indexes/IndexDefinition";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode, OperationResultType } from "../../..";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { HeadersBuilder } from "../../../Utility/HttpUtil";
import { ReplacerContext } from "../../../Mapping/Json/ReplacerFactory";
import { IndexTypeExtensions } from "../../Indexes/IndexTypeExtensions";
import * as stream from "readable-stream";

export interface PutIndexResult {
    indexName: string;
}

export class PutIndexesOperation implements IMaintenanceOperation<PutIndexResult[]> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    private readonly _indexToAdd: IndexDefinition[];

    public constructor(...indexToAdd: IndexDefinition[]) {
        if (!indexToAdd || !indexToAdd.length) {
            throwError("InvalidArgumentException", "indexToAdd cannot be null");
        }
        this._indexToAdd = indexToAdd;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<PutIndexResult[]> {
        return new PutIndexesCommand(conventions, this._indexToAdd);
    }
}

export class PutIndexesCommand extends RavenCommand<PutIndexResult[]> {

    private readonly _indexToAdd: object[];
    private _allJavaScriptIndexes: boolean;
    private readonly _conventions: DocumentConventions;

    public constructor(conventions: DocumentConventions, indexesToAdd: IndexDefinition[]) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "conventions cannot be null or undefined.");
        }

        if (!indexesToAdd) {
            throwError("InvalidArgumentException", "indexesToAdd cannot be null or undefined.");
        }

        this._conventions = conventions;
        this._allJavaScriptIndexes = true;
        this._indexToAdd = indexesToAdd.reduce((result, next) => {
            // We validate on the server that it is indeed a javascript index.
            if (!IndexTypeExtensions.isJavaScript(next.type)) {
                this._allJavaScriptIndexes = false;
            }

            if (!next.name) {
                throwError("InvalidArgumentException", "Index name cannot be null.");
            }

            result.push(this._conventions.objectMapper.toObjectLiteral(next));

            return result;
        }, []);
    }

    protected get _serializer(): JsonSerializer {
        const INDEX_DEF_FIELDS_REGEX = /^Indexes\.(\d+)\.Fields$/;
        const serializer = super._serializer;
        serializer.replacerRules[0].contextMatcher = (context: ReplacerContext) => {
            // fields are case-sensitive, so we need to skip PascalCasing their names
            const m = context.currentPath.match(INDEX_DEF_FIELDS_REGEX);
            return !m;
        };

        return serializer;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database 
            + (this._allJavaScriptIndexes ? "/indexes" : "/admin/indexes");

        const body = this._serializer
            .serialize({ Indexes: this._indexToAdd });

        const headers = HeadersBuilder
            .create()
            .typeAppJson()
            .build();
        return {
            method: "PUT",
            uri,
            body,
            headers
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        let body: string = null;
        await this._defaultPipeline(x => body = x)
            .process(bodyStream)
            .then(results => {
                this.result = results["results"];
            });
        return body;
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
