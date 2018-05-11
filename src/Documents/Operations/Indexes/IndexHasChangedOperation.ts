import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { IndexDefinition } from "../../Indexes/IndexDefinition";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestBase } from "../../../Primitives/Http";
import { JsonSerializer } from "../../../Mapping";
import { HeadersBuilder } from "../../../Utility/HttpUtil";

export class IndexHasChangedOperation implements IMaintenanceOperation<Boolean> {

    private _definition: IndexDefinition;

    public constructor(definition: IndexDefinition) {
        if (!definition) {
            throwError("InvalidArgumentException", "IndexDefinition cannot be null");
        }

        this._definition = definition;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<boolean>  {
        return new IndexHasChangedCommand(conventions, this._definition);
    }

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }
}

export class IndexHasChangedCommand extends RavenCommand<boolean> {

        private _definition: object;

        public constructor(conventions: DocumentConventions, definition: IndexDefinition) {
            super();

            this._definition = this._typedObjectMapper.toObjectLiteral(definition);
        }

        public get isReadRequest(): boolean {
            return false;
        }

        public createRequest(node: ServerNode): HttpRequestBase {
            const uri = node.url + "/databases/" + node.database + "/indexes/has-changed";

            const body = JsonSerializer.getDefaultForCommandPayload()
                .serialize(this._definition);

            const headers = HeadersBuilder.create()
                .withContentTypeJson().build();
            return {
                method: "POST",
                uri,
                body,
                headers
            };
        }

        public setResponse(response: string, fromCache: boolean): void {
            if (!response) {
                this._throwInvalidResponse();
            }

            const resObj = JsonSerializer.getDefaultForCommandPayload().deserialize(response);
            this.result = resObj["changed"];
        }
    }
