import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { DocumentConventions } from "../..";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";

export class GetDatabaseNamesOperation implements IServerOperation<string[]> {

    private readonly _start: number;
    private readonly _pageSize: number;

    public constructor(start: number, pageSize: number) {
        this._start = start;
        this._pageSize = pageSize;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<string[]> {
        return new GetDatabaseNamesCommand(this._start, this._pageSize);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class GetDatabaseNamesCommand extends RavenCommand<string[]> {
        private readonly _start: number;
        private readonly _pageSize: number;

        public constructor(start: number, pageSize: number) {
            super();
            this._start = start;
            this._pageSize = pageSize;
        }

        public get isReadRequest() {
            return true;
        }

        public createRequest(node: ServerNode): HttpRequestParameters {
            const uri = `${node.url}/databases?start=${this._start}&pageSize=${this._pageSize}&namesOnly=true`;
            return { uri };
        }

        public setResponse(response: string, fromCache: boolean): void {
            if (!response) {
                this._throwInvalidResponse();
                return;
            }

            const { databases }  = 
                this._serializer.deserialize<IRavenResponse>(response) as { databases: string[] };
            if (!databases || !Array.isArray(databases) || !databases.length) {
                this._throwInvalidResponse();
            }

            this.result = databases;
        }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
            return;
        }

        let body;
        const results = await this._defaultPipeline(_ => body = _)
            .process(bodyStream);
        const { databases } = results as any;
        if (!databases || !Array.isArray(databases) || !databases.length) {
            this._throwInvalidResponse();
        }

        this.result = databases;

        return body;
    }
    }
