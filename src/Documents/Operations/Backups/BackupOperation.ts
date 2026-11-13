import { IMaintenanceOperation, OperationIdResult, OperationResultType } from "../OperationAbstractions.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { throwError } from "../../../Exceptions/index.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { BackupConfiguration } from "./BackupConfiguration.js";
import { BackupSettings } from "./BackupSettings.js";
import { StartBackupOperationResult } from "./StartBackupOperationResult.js";

export class BackupOperation implements IMaintenanceOperation<OperationIdResult> {
    private readonly _backupConfiguration: BackupConfiguration;

    public constructor(backupConfiguration: BackupConfiguration) {
        if (!backupConfiguration) {
            throwError("InvalidArgumentException", "BackupConfiguration cannot be null");
        }

        if (!hasBackup(backupConfiguration)) {
            throwError("InvalidOperationException",
                "Cannot start the one-time backup using the provided configuration since the backup configuration defines no destinations.");
        }

        this._backupConfiguration = backupConfiguration;
    }

    public get resultType(): OperationResultType {
        return "OperationId";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<OperationIdResult> {
        return new BackupCommand(this._backupConfiguration);
    }
}

export class BackupCommand extends RavenCommand<OperationIdResult> {
    private readonly _backupConfiguration: BackupConfiguration;

    public constructor(backupConfiguration: BackupConfiguration) {
        super();

        this._backupConfiguration = backupConfiguration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/backup";

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body: this._serializer.serialize(this._backupConfiguration)
        };
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        const body = await this._parseResponseDefaultAsync(bodyStream);
        const result = this.result as OperationIdResult & StartBackupOperationResult;
        result.operationNodeTag ??= result.responsibleNode;
        return body;
    }
}

function hasBackup(configuration: BackupConfiguration): boolean {
    return canBackupUsing(configuration.localSettings, configuration.localSettings?.folderPath)
        || canBackupUsing(configuration.s3Settings, configuration.s3Settings?.bucketName)
        || canBackupUsing(configuration.glacierSettings, configuration.glacierSettings?.vaultName)
        || canBackupUsing(configuration.azureSettings, configuration.azureSettings?.storageContainer)
        || canBackupUsing(configuration.googleCloudSettings, configuration.googleCloudSettings?.bucketName)
        || canBackupUsing(configuration.ftpSettings, configuration.ftpSettings?.url);
}

function canBackupUsing(settings: BackupSettings, target: string): boolean {
    return !!settings
        && !settings.disabled
        && (!StringUtil.isNullOrWhitespace(settings.getBackupConfigurationScript?.exec)
            || !StringUtil.isNullOrWhitespace(target));
}
