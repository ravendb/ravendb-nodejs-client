import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IndexDefinition } from "../../Indexes/IndexDefinition";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { 
    RavenCommandResponsePipeline, 
    IRavenCommandResponsePipelineResult } from "../../../Http/RavenCommandResponsePipeline";
import * as stream from "readable-stream";

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
        return "CommandResult";
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

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database
            + "/indexes?start=" + this._start + "&pageSize=" + this._pageSize;
        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return RavenCommandResponsePipeline.create()
            .collectBody()
            .parseJsonSync()
            .streamKeyCaseTransform({
                targetKeyCaseConvention: "camel",
                ignorePaths:  [ /fields\.[^.]+$/i ]
            })
            .process(bodyStream)
            .then((result: IRavenCommandResponsePipelineResult<object>) => {
                const indexDefTypeInfo = {
                    nestedTypes: {
                        "results[]": "IndexDefinition",
                        "results[].maps": "Set"
                    },
                };
                const knownTypes = new Map([[IndexDefinition.name, IndexDefinition]]);
                const allResults = this._reviveResultTypes(result.result, indexDefTypeInfo, knownTypes);
                this.result = allResults["results"];
                return result.body;
            });
    }

    public get isReadRequest(): boolean {
        return true;
    }
}

