import {JsonSerializer} from "../../../Mapping/Json/Serializer";
import { IMaintenanceOperation } from "../OperationAbstractions";
import { IndexDefinition } from "../../Indexes/IndexDefinition";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { Mapping } from "../../../Mapping";
import { ServerNode, OperationResultType } from "../../..";
import { HttpRequestBase } from "../../../Primitives/Http";
import { HeadersBuilder } from "../../../Utility/HttpUtil";
import { ReplacerContext } from "../../../Mapping/Json/ReplacerFactory";

export interface PutIndexResult {
    indexName: string;
}

export class PutIndexesOperation implements IMaintenanceOperation<PutIndexResult[]> {

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

    private _indexToAdd: IndexDefinition[];

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

    private _indexToAdd: object[];

    public constructor(conventions: DocumentConventions, indexesToAdd: IndexDefinition[]) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "conventions cannot be null or undefined.");
        }

        if (!indexesToAdd) {
            throwError("InvalidArgumentException", "indexesToAdd cannot be null or undefined.");
        }

        this._indexToAdd = indexesToAdd.reduce((result, next) => {
            if (!next.name) {
                throwError("InvalidArgumentException", "Index name cannot be null.");
            }

            result.push(Mapping.getDefaultMapper().toObjectLiteral(next));

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

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/admin/indexes";
        
        const body = this._serializer
            .serialize({ Indexes: this._indexToAdd });

        const headers = HeadersBuilder
            .create()
            .withContentTypeJson()
            .build();
        return {
            method: "PUT",
            uri,
            body,
            headers
        };
    }

    public setResponse(response: string, fromCache: boolean) {
        this.result = this._serializer.deserialize(response)["results"];
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
