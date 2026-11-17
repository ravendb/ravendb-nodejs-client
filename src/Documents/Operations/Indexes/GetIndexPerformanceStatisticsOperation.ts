import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { IndexPerformanceStats } from "../../Indexes/IndexPerformanceStats.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { throwError } from "../../../Exceptions/index.js";

export class GetIndexPerformanceStatisticsOperation implements IMaintenanceOperation<IndexPerformanceStats[]> {
    private readonly _indexNames: string[];

    public constructor();
    public constructor(indexNames: string[]);
    public constructor(...args: [] | [string[]]) {
        if (args.length > 0 && !args[0]) {
            throwError("InvalidArgumentException", "IndexNames cannot be null");
        }
        this._indexNames = args[0];
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexPerformanceStats[]> {
        return new GetIndexPerformanceStatisticsCommand(this._indexNames, conventions);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class GetIndexPerformanceStatisticsCommand extends RavenCommand<IndexPerformanceStats[]> {
    private readonly _indexNames: string[];
    private readonly _conventions: DocumentConventions;

    public constructor(indexNames: string[], conventions: DocumentConventions) {
        super();
        this._indexNames = indexNames;
        this._conventions = conventions;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/" + node.database + "/indexes/performance";

        if (this._indexNames?.length) {
            uri += "?" + this._indexNames.map(name => "name=" + this._urlEncode(name)).join("&");
        }

        return { uri };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        const typeInfo = {
            nestedTypes: {
                "results[].performance[].started": "date",
                "results[].performance[].completed": "date"
            }
        };

        let body: string = null;
        const results = await this._defaultPipeline(_ => body = _).process(bodyStream);
        if (!results["results"]) {
            this._throwInvalidResponse();
        }

        this.result = this._reviveResultTypes(results, this._conventions, typeInfo)["results"];
        return body;
    }
}
