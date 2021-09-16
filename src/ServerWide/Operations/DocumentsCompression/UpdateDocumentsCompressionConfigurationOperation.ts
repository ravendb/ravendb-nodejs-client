import { IMaintenanceOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { DocumentCompressionConfigurationResult } from "./DocumentCompressionConfigurationResult";
import { DocumentsCompressionConfiguration } from "../../DocumentsCompressionConfiguration";
import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import * as stream from "readable-stream";

export class UpdateDocumentsCompressionConfigurationOperation implements IMaintenanceOperation<DocumentCompressionConfigurationResult> {
    private readonly _documentsCompressionConfiguration: DocumentsCompressionConfiguration;

    public constructor(configuration: DocumentsCompressionConfiguration) {
        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._documentsCompressionConfiguration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<DocumentCompressionConfigurationResult> {
        return new UpdateDocumentCompressionConfigurationCommand(this._documentsCompressionConfiguration);
    }
}

class UpdateDocumentCompressionConfigurationCommand extends RavenCommand<DocumentCompressionConfigurationResult> implements IRaftCommand {
    private _documentsCompressionConfiguration: DocumentsCompressionConfiguration;

    public constructor(configuration: DocumentsCompressionConfiguration) {
        super();

        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._documentsCompressionConfiguration = configuration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/documents-compression/config";
        const headers = this._headers()
            .typeAppJson().build();
        const body = this._serializer.serialize(this._documentsCompressionConfiguration);

        return {
            uri,
            method: "POST",
            headers,
            body
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        return await this._parseResponseDefaultAsync(bodyStream);
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}

