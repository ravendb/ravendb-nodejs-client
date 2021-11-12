import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { AnalyzerDefinition } from "../../Indexes/Analysis/AnalyzerDefinition";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { HeadersBuilder } from "../../../Utility/HttpUtil";

export class PutAnalyzersOperation implements IMaintenanceOperation<void> {
    private readonly _analyzersToAdd: AnalyzerDefinition[];

    public constructor(...analyzersToAdd: AnalyzerDefinition[]) {
        if (!analyzersToAdd || analyzersToAdd.length === 0) {
            throwError("InvalidArgumentException", "AnalyzersToAdd cannot be null or empty");
        }

        this._analyzersToAdd = analyzersToAdd;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new PutAnalyzersCommand(conventions, this._analyzersToAdd);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class PutAnalyzersCommand extends RavenCommand<void> implements IRaftCommand {
    private readonly _analyzersToAdd: object[];

    public constructor(conventions: DocumentConventions, analyzersToAdd: AnalyzerDefinition[]) {
        super();
        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!analyzersToAdd) {
            throwError("InvalidArgumentException", "Analyzers to add cannot be null");
        }

        this._analyzersToAdd = [];

        for (const analyzerDefinition of analyzersToAdd) {
            if (!analyzerDefinition.name) {
                throwError("InvalidArgumentException", "Name cannot be null");
            }

            this._analyzersToAdd.push(conventions.objectMapper.toObjectLiteral(analyzerDefinition));
        }
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/analyzers";

        const headers = HeadersBuilder
            .create()
            .typeAppJson()
            .build();

        const body = this._serializer
            .serialize({
                Analyzers: this._analyzersToAdd
            });

        return {
            uri,
            method: "PUT",
            headers,
            body
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}