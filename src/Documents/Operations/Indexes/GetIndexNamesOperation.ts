import { IMaintenanceOperation } from "../OperationAbstractions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions, ServerNode, OperationResultType } from "../../..";
import { HttpRequestBase } from "../../../Primitives/Http";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";

export class GetIndexNamesOperation implements IMaintenanceOperation<string[]> {

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

    private _start: number;
    private _pageSize: number;

    public constructor(start: number, pageSize: number) {
        this._start = start;
        this._pageSize = pageSize;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<string[]> {
        return new GetIndexNamesCommand(this._start, this._pageSize);
    }
}

export class GetIndexNamesCommand extends RavenCommand<string[]> {
    private _start: number;
    private _pageSize: number;

    public constructor(start: number, pageSize: number) {
        super();

        this._start = start;
        this._pageSize = pageSize;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database
            + "/indexes?start=" + this._start + "&pageSize=" + this._pageSize + "&namesOnly=true";
        return { uri };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
        }

        this.result = this._serializer.deserialize(response)["results"];
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
