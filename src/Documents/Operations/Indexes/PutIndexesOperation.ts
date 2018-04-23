import { IMaintenanceOperation } from "../OperationAbstractions";
import { IndexDefinition } from "../../Indexes/IndexDefinition";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { EntityToJson } from "../../Session/EntityToJson";
import { Mapping, JsonSerializer } from "../../../Mapping";
import { ServerNode, OperationResultType } from "../../..";
import { HttpRequestBase } from "../../../Primitives/Http";
import { HeadersBuilder } from "../../../Utility/HttpUtil";

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

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/admin/indexes";
        const body = JsonSerializer.getDefaultForCommandPayload()
            .serialize({ Indexes: this._indexToAdd });
            console.log(body);
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
        this.result = JsonSerializer.getDefaultForCommandPayload()
            .deserialize(response)["results"];
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
