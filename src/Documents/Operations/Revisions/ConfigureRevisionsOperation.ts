import {IMaintenanceOperation, OperationResultType} from "../OperationAbstractions";
import {RevisionsConfiguration} from "../RevisionsConfiguration";
import {DocumentConventions, ServerNode} from "../../..";
import {RavenCommand} from "../../../Http/RavenCommand";
import {HttpRequestParameters} from "../../../Primitives/Http";
import * as stream from "readable-stream";

export class ConfigureRevisionsOperation implements IMaintenanceOperation<ConfigureRevisionsOperationResult> {
    private readonly _configuration: RevisionsConfiguration;

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public constructor(configuration: RevisionsConfiguration) {
        this._configuration = configuration;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<ConfigureRevisionsOperationResult> {
        return new ConfigureRevisionsCommand(conventions, this._configuration);
    }
}

export class ConfigureRevisionsCommand extends RavenCommand<ConfigureRevisionsOperationResult> {
    private readonly _conventions: DocumentConventions;
    private readonly _configuration: RevisionsConfiguration;

    public constructor(conventions: DocumentConventions, configuration: RevisionsConfiguration) {
        super();
        this._conventions = conventions;
        this._configuration = configuration;
    }

    public get isReadRequest() {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/revisions/config";

        const body = JSON.stringify(this._configuration.toRemoteFieldNames(), null, 0);
        return {
            uri,
            method: "POST",
            body
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        await this._defaultPipeline(_ => body = _)
            .process(bodyStream)
            .then(results => {
                this.result = Object.assign(new ConfigureRevisionsOperationResult(), results);
            });

        return body;
    }
}

export class ConfigureRevisionsOperationResult {
    public raftCommandIndex: number;
}
