import { HttpRequestBase } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IndexDefinition } from "../../Indexes/IndexDefinition";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";

export class GetIndexesOperation implements IMaintenanceOperation<IndexDefinition[]> {

    private _start: number;
    private _pageSize: number;

    public constructor(start: number, pageSize: number) {
        this._start = start;
        this._pageSize = pageSize;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexDefinition[]> {
        return new GetIndexesCommand(this._start, this._pageSize);
    }

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

}

export class GetIndexesCommand extends RavenCommand<IndexDefinition[]> {
    private _start: number;
    private _pageSize: number;

    public constructor(start: number, pageSize: number) {
        super();
        this._start = start;
        this._pageSize = pageSize;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database
            + "/indexes?start=" + this._start + "&pageSize=" + this._pageSize;
        return { uri };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
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

        this.result = result["results"];
    }

    public get isReadRequest(): boolean {
        return true;
    }
}

