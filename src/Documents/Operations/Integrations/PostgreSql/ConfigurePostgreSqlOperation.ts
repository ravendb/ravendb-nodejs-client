import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { PostgreSqlConfiguration } from "../../../../ServerWide/Operations/Integrations/PostgreSql/PostgreSqlConfiguration.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { IRaftCommand } from "../../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../../Utility/RaftIdGenerator.js";
import { throwError } from "../../../../Exceptions/index.js";

export class ConfigurePostgreSqlOperation implements IMaintenanceOperation<ConfigurePostgreSqlOperationResult> {
    private readonly _configuration: PostgreSqlConfiguration;

    public constructor(configuration: PostgreSqlConfiguration) {
        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }
        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<ConfigurePostgreSqlOperationResult> {
        return new ConfigurePostgreSqlCommand(this._configuration);
    }
}

class ConfigurePostgreSqlCommand extends RavenCommand<ConfigurePostgreSqlOperationResult> implements IRaftCommand {
    private readonly _configuration: PostgreSqlConfiguration;

    public constructor(configuration: PostgreSqlConfiguration) {
        super();
        this._configuration = configuration;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        return {
            uri: node.url + "/databases/" + node.database + "/admin/integrations/postgresql/config",
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body: this._serializer.serialize(this._configuration)
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}

export interface ConfigurePostgreSqlOperationResult {
    raftCommandIndex: number;
}
