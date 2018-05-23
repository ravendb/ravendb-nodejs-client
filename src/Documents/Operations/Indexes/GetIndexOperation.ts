import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { IndexDefinition } from "../../Indexes/IndexDefinition";
import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpRequestBase } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";

export class GetIndexOperation implements IMaintenanceOperation<IndexDefinition> {

    private _indexName: string;

    public constructor(indexName: string) {
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null.");
        }

        this._indexName = indexName;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexDefinition> {
        return new GetIndexCommand(this._indexName);
    }

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }
}

export class GetIndexCommand extends RavenCommand<IndexDefinition> {

        private _indexName: string;

        public constructor(indexName: string) {
            super();
            if (!indexName) {
                throwError("InvalidArgumentException", "IndexName cannot be null.");
            }

            this._indexName = indexName;
        }

        public createRequest(node: ServerNode): HttpRequestBase {
            const uri = node.url + "/databases/" + node.database + "/indexes?name=" 
                + encodeURIComponent(this._indexName);

            return { uri };
        }

        public setResponse(response: string, fromCache: boolean): void {
            if (!response) {
                return;
            }

            const parsed = this._serializer.deserialize(response);
            const indexDefTypeInfo = {
                nestedTypes: {
                    "results[]": "IndexDefinition",
                    "results[].maps": "Set"
                },
            };

            const result = this._typedObjectMapper.fromObjectLiteral(
                parsed, indexDefTypeInfo, new Map([[IndexDefinition.name, IndexDefinition]]));
            
            this.result = result["results"][0] || null;
        }

        public get isReadRequest(): boolean {
            return true;
        }
    }
