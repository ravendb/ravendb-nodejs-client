import { IServerOperation, OperationResultType } from "../../src/Documents/Operations/OperationAbstractions";
import { RavenCommand } from "../../src/Http/RavenCommand";
import { HttpRequestParameters } from "../../src/Primitives/Http";
import { DocumentConventions } from "../../src/Documents/Conventions/DocumentConventions";
import { ServerNode } from "../../src/Http/ServerNode";
import * as stream from "readable-stream";

export class AdminJsConsoleOperation implements IServerOperation<any> {
    private readonly _script: string;

    public constructor(script: string) {
        this._script = script;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<any> {
        return new AdminJsConsoleCommand(this._script);
    }
}

class AdminJsConsoleCommand extends RavenCommand<any> {
    private readonly _script: string;

    public constructor(script: string) {
        super();

        this._script = script;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/console?serverScript=true";

        const body = this._serializer.serialize({
            Script: this._script
        });

        return {
            method: "POST",
            uri,
            body,
            headers: this._headers().typeAppJson().build()
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }
}