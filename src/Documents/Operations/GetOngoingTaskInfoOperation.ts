import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions.js";
import { OngoingTask, OngoingTaskEmbeddingsGeneration } from "./OngoingTasks/OngoingTask.js";
import { OngoingTaskType } from "./OngoingTasks/OngoingTaskType.js";
import { TypeUtil } from "../../Utility/TypeUtil.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";
import { Stream } from "node:stream";
import { NestedTypes } from "../../Mapping/ObjectMapper.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { throwError } from "../../Exceptions/index.js";
import { RavenEtlConfiguration } from "./Etl/RavenEtlConfiguration.js";
import { SqlEtlConfiguration } from "./Etl/Sql/SqlEtlConfiguration.js";
import { SnowflakeEtlConfiguration } from "./Etl/Snowflake/SnowflakeEtlConfiguration.js";
import { OlapEtlConfiguration } from "./Etl/Olap/OlapEtlConfiguration.js";
import { ElasticSearchEtlConfiguration } from "./Etl/ElasticSearch/ElasticSearchEtlConfiguration.js";
import { QueueEtlConfiguration } from "./Etl/Queue/QueueEtlConfiguration.js";
import { Transformation } from "./Etl/Transformation.js";
import { GenAiConfiguration } from "./AI/GenAiConfiguration.js";
import { EmbeddingsGenerationConfiguration } from "./AI/EmbeddingsGenerationConfiguration.js";
import { TimeUtil } from "../../Utility/TimeUtil.js";

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

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = null;
            return null;
        }

        let body: string = null;
        const results = await this._defaultPipeline(_ => body = _)
            .process(bodyStream);
        let nestedTypes: NestedTypes = {};

        switch (this._type) {
            case "Replication": {
                // nothing to do
                break;
            }
            case "RavenEtl": {
                nestedTypes = {
                    configuration: "RavenEtlConfiguration",
                    "configuration.transforms": "Transformation"
                };
                break;
            }
            case "SqlEtl": {
                nestedTypes = {
                    configuration: "SqlEtlConfiguration",
                    "configuration.transforms": "Transformation"
                };
                break;
            }
            case "SnowflakeEtl": {
                nestedTypes = {
                    configuration: "SnowflakeEtlConfiguration",
                    "configuration.transforms": "Transformation"
                };
                break;
            }
            case "Subscription": {
                nestedTypes = {
                    lastBatchAckTime: "date",
                    lastClientConnectionTime: "date"
                }
                break;
            }
            case "OlapEtl": {
                nestedTypes = {
                    configuration: "OlapEtlConfiguration",
                    "configuration.transforms": "Transformation"
                }
                break;
            }
            case "ElasticSearchEtl": {
                nestedTypes = {
                    configuration: "ElasticSearchEtlConfiguration",
                    "configuration.transforms": "Transformation"
                }
                break;
            }
            case "QueueEtl": {
                nestedTypes = {
                    configuration: "QueueEtlConfiguration",
                    "configuration.transforms": "Transformation"
                }
                break;
            }
            case "PullReplicationAsSink": {
                break;
            }
            case "PullReplicationAsHub": {
                break;
            }
            case "QueueSink": {
                break;
            }
            case "CdcSink": {
                nestedTypes = {
                    lastBatchTime: "date",
                    lastActivityTime: "date"
                }
                break;
            }
            case "GenAi": {
                nestedTypes = {
                    configuration: "GenAiConfiguration",
                    "configuration.transforms": "Transformation"
                };
                break;
            }
            case "EmbeddingsGeneration": {
                nestedTypes = {
                    configuration: "EmbeddingsGenerationConfiguration",
                    "configuration.transforms": "Transformation"
                };
                break;
            }
            case "Backup": {
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
        }

        this.result = this._reviveResultTypes<OngoingTask>(
            results,
            this._conventions,
            {
                nestedTypes
            },
            knownTypes);

        if (this._type === "EmbeddingsGeneration" && this.result) {
            const configuration = (this.result as OngoingTaskEmbeddingsGeneration).configuration;
            configuration.embeddingsCacheExpiration = TimeUtil.timeSpanToDuration(configuration.embeddingsCacheExpiration as unknown as string);
            configuration.embeddingsCacheForQueryingExpiration = TimeUtil.timeSpanToDuration(configuration.embeddingsCacheForQueryingExpiration as unknown as string);
        }

        return body;
    }

    get isReadRequest(): boolean {
        return false;
    }
}

const knownTypes = new Map<string, any>([
    [RavenEtlConfiguration.name, RavenEtlConfiguration],
    [SqlEtlConfiguration.name, SqlEtlConfiguration],
    [SnowflakeEtlConfiguration.name, SnowflakeEtlConfiguration],
    [OlapEtlConfiguration.name, OlapEtlConfiguration],
    [ElasticSearchEtlConfiguration.name, ElasticSearchEtlConfiguration],
    [QueueEtlConfiguration.name, QueueEtlConfiguration],
    [Transformation.name, Transformation],
    [GenAiConfiguration.name, GenAiConfiguration],
    [EmbeddingsGenerationConfiguration.name, EmbeddingsGenerationConfiguration],
]);
