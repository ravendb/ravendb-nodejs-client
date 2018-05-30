import { IServerOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { DocumentConventions } from "../..";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestBase } from "../../Primitives/Http";

export class GetDatabaseNamesOperation implements IServerOperation<string[]> {

    private _start: number;
    private _pageSize: number;

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
        private _start: number;
        private _pageSize: number;

        public constructor(start: number, pageSize: number) {
            super();
            this._start = start;
            this._pageSize = pageSize;
        }

        public get isReadRequest() {
            return true;
        }

        public createRequest(node: ServerNode): HttpRequestBase {
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
    }
