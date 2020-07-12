import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions";
import { OngoingTask } from "./OngoingTasks/OngoingTask";
import { OngoingTaskType } from "./OngoingTasks/OngoingTaskType";
import { TypeUtil } from "../../Utility/TypeUtil";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "stream";
import { NestedTypes } from "../../Mapping/ObjectMapper";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";

export class GetOngoingTaskInfoOperation implements IMaintenanceOperation<OngoingTask> {
    private readonly _taskName: string;
    private readonly _taskId: number;
    private readonly _type: OngoingTaskType;

    public constructor(taskId: number, type: OngoingTaskType)
    public constructor(taskName: string, type: OngoingTaskType)
    public constructor(taskIdOrName: number | string, type: OngoingTaskType) {
        if (TypeUtil.isString(taskIdOrName)) {
            this._taskName = taskIdOrName;
        } else {
            this._taskId = taskIdOrName;
        }

        this._type = type;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<OngoingTask> {
        return new GetOngoingTaskInfoCommand(this._taskName || this._taskId, this._type, conventions);
    }
}

class GetOngoingTaskInfoCommand extends RavenCommand<OngoingTask> {
    private readonly _taskName: string;
    private readonly _taskId: number;
    private readonly _type: OngoingTaskType;
    private readonly _conventions: DocumentConventions;

    public constructor(taskIdOrName: number | string, type: OngoingTaskType, documentConventions: DocumentConventions) {
        super();

        if (TypeUtil.isString(taskIdOrName)) {
            this._taskName = taskIdOrName;
        } else {
            this._taskId = taskIdOrName;
        }

        this._type = type;
        this._conventions = documentConventions;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = this._taskName
            ? node.url + "/databases/" + node.database + "/task?taskName=" + encodeURIComponent(this._taskName) + "&type=" + this._type
            : node.url + "/databases/" + node.database + "/task?key=" + this._taskId + "&type=" + this._type;

        return {
            uri,
            method: "GET"
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        let body: string = null;
        await this._defaultPipeline(_ => body = _)
            .process(bodyStream)
            .then(results => {
                let nestedTypes: NestedTypes = {};

                switch (this._type) {
                    case "Replication":
                        // nothing to do
                        break;
                    case "RavenEtl":
                        //TODO: configuration: RavenEtlConfiguration;
                        break;
                    case "SqlEtl":
                        //TODO: configuration: SqlEtlConfiguration
                        break;
                    case "Subscription":
                        nestedTypes = {
                            lastBatchAckTime: "date",
                            lastClientConnectionTime: "date"
                        }
                        break;
                    case "Backup":
                        //TODO:lastFullBackup: Date, lastIncrementalBackup: Date;, RunningBackup, NextBackup!
                        break;
                }

                this.result = this._reviveResultTypes<OngoingTask>(
                    results,
                    this._conventions,
                    {
                        nestedTypes
                    });
            });
        return body;
    }

    get isReadRequest(): boolean {
        return false;
    }
}
