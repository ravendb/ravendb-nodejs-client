import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { throwError } from "../../../Exceptions/index.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { IndexResetMode } from "../../Indexes/IndexResetMode.js";

export class ResetIndexOperation implements IMaintenanceOperation<void> {

    private readonly _indexName: string;
    private readonly _indexResetMode: IndexResetMode;

    /**
     * @param indexName The name of the index to be reset.
     * @param indexResetMode "InPlace" or "SideBySide". When omitted, the server uses its Indexing.ResetMode configuration.
     */
    public constructor(indexName: string, indexResetMode?: IndexResetMode) {
        if (!indexName) {
            throwError("InvalidArgumentException", "Index name cannot be null.");
        }

        this._indexName = indexName;
        this._indexResetMode = indexResetMode;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new ResetIndexCommand(this._indexName, this._indexResetMode);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class ResetIndexCommand extends RavenCommand<void> {
    private readonly _indexName: string;
    private readonly _indexResetMode: IndexResetMode;

    public constructor(indexName: string, indexResetMode?: IndexResetMode) {
        super();

        if (!indexName) {
            throwError("InvalidArgumentException", "Index name cannot be null.");
        }

        this._indexName = indexName;
        this._indexResetMode = indexResetMode;
        this._responseType = "Empty";
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/" + node.database + "/indexes?name=" + encodeURIComponent(this._indexName);
        if (this._indexResetMode) {
            uri += "&mode=" + this._indexResetMode;
        }

        return { method: "RESET", uri };
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
