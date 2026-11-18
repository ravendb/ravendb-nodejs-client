import { RavenCommand } from "../../Http/RavenCommand.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";
import { Stream } from "node:stream";

export interface IsDatabaseLoadedCommandResult {
    databaseName: string;
    isLoaded: boolean;
}

export class IsDatabaseLoadedCommand extends RavenCommand<IsDatabaseLoadedCommandResult> {

    public createRequest(node: ServerNode): HttpRequestParameters {
        return {
            uri: node.url + "/debug/is-loaded?name=" + this._urlEncode(node.database),
            method: "GET"
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
