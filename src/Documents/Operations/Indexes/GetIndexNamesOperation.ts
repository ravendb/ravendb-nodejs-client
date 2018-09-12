import { IMaintenanceOperation } from "../OperationAbstractions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions, ServerNode, OperationResultType } from "../../..";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";

export class GetIndexNamesOperation implements IMaintenanceOperation<string[]> {

    public get resultType(): OperationResultType {
        return "CommandResult";
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

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database
            + "/indexes?start=" + this._start + "&pageSize=" + this._pageSize + "&namesOnly=true";
        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body;
        await this._defaultPipeline(_ => body = _).process(bodyStream)
            .then(results => {
                this.result = results["results"];
            });
        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
