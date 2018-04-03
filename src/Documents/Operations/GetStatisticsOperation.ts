import { ServerNode } from "../../Http/ServerNode";
import { RavenCommand } from "../../Http/RavenCommand";
import { HttpRequestBase } from "../../Primitives/Http";
import { IMaintenanceOperation } from "../Operations/IMaintenanceOperation";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { DatabaseStatistics } from "./DatabaseStatistics";

export class GetStatisticsOperation implements IMaintenanceOperation<DatabaseStatistics> {

    private readonly _debugTag: string;

    public constructor(debugTag?: string) {
        this._debugTag = debugTag;
    }

    public  getCommand(conventions: DocumentConventions): RavenCommand<DatabaseStatistics> {
        return new GetStatisticsCommand(this._debugTag);
    }
}

export class GetStatisticsCommand extends RavenCommand<DatabaseStatistics> {

        private _debugTag: string;

        public constructor(debugTag?: string) {
            super();
            this._debugTag = debugTag;
        }

        public createRequest(node: ServerNode): HttpRequestBase {
            let uri = `${node.url}/databases/${node.database}/stats`;
            if (this._debugTag) {
                uri += "?" + this._debugTag;
            }

            return { uri };
        }

        public setResponse(response: string, fromCache: boolean): void {
            this.result = this.mapper.deserialize(response);
        }

        public get isReadRequest() {
            return true;
        }
    }