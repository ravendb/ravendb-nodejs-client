import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions";
import { OngoingTask } from "./OngoingTasks/OngoingTask";
import { OngoingTaskType } from "./OngoingTasks/OngoingTaskType";
import { TypeUtil } from "../../Utility/TypeUtil";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";
import { NestedTypes } from "../../Mapping/ObjectMapper";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { throwError } from "../../Exceptions/index";
import { RavenEtlConfiguration } from "./Etl/RavenEtlConfiguration";
import { SqlEtlConfiguration } from "./Etl/Sql/SqlEtlConfiguration";
import { OlapEtlConfiguration } from "./Etl/Olap/OlapEtlConfiguration";
import { ElasticSearchEtlConfiguration } from "./Etl/ElasticSearch/ElasticSearchEtlConfiguration";
import { QueueEtlConfiguration } from "./Etl/Queue/QueueEtlConfiguration";

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

        if (type === "PullReplicationAsHub") {
            throwError("InvalidArgumentException", "PullReplicationAsHub type is not supported. " +
                "Please use GetPullReplicationTasksInfoOperation instead.");
        }
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
        const results = await this._defaultPipeline(_ => body = _)
            .process(bodyStream);
        let nestedTypes: NestedTypes = {};

        switch (this._type) {
            case "Replication":
                // nothing to do
                break;
            case "RavenEtl":
                nestedTypes = {
                    configuration: "RavenEtlConfiguration"
                };
                break;
            case "SqlEtl":
                nestedTypes = {
                    configuration: "SqlEtlConfiguration"
                };
                break;
            case "Subscription":
                nestedTypes = {
                    lastBatchAckTime: "date",
                    lastClientConnectionTime: "date"
                }
                break;
            case "OlapEtl":
                nestedTypes = {
                    configuration: "OlapEtlConfiguration"
                }
                break;
            case "ElasticSearchEtl":
                nestedTypes = {
                    configuration: "ElasticSearchEtlConfiguration"
                }
                break;
            case "QueueEtl":
                nestedTypes = {
                    configuration: "QueueEtlConfiguration"
                }
                break;
            case "PullReplicationAsSink":
                break;
            case "Backup":
                nestedTypes = {
                    lastFullBackup: "date",
                    delayUntil: "date",
                    originalBackupTime: "date",
                    lastIncrementalBackup: "date",
                    "onGoingBackup.startTime": "date",
                    "nextBackup.dateTime": "date",
                    "nextBackup.originalBackupTime": "date",
                }
                break;
        }

        this.result = this._reviveResultTypes<OngoingTask>(
            results,
            this._conventions,
            {
                nestedTypes
            },
            knownTypes);
        return body;
    }

    get isReadRequest(): boolean {
        return false;
    }
}

const knownTypes = new Map<string, any>([
    [RavenEtlConfiguration.name, RavenEtlConfiguration],
    [SqlEtlConfiguration.name, SqlEtlConfiguration],
    [OlapEtlConfiguration.name, OlapEtlConfiguration],
    [ElasticSearchEtlConfiguration.name, ElasticSearchEtlConfiguration],
    [QueueEtlConfiguration.name, QueueEtlConfiguration]
]);
