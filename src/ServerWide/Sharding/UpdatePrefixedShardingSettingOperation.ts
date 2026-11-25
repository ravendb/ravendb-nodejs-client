import { IMaintenanceOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions.js";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { throwError } from "../../Exceptions/index.js";
import { PrefixedShardingSetting } from "./PrefixedShardingSetting.js";
import { PrefixedShardingCommand } from "./PrefixedShardingCommand.js";

export class UpdatePrefixedShardingSettingOperation implements IMaintenanceOperation<void> {
    private readonly _setting: PrefixedShardingSetting;

    public constructor(setting: PrefixedShardingSetting) {
        if (!setting) {
            throwError("InvalidArgumentException", "Setting cannot be null");
        }
        this._setting = setting;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new PrefixedShardingCommand("POST", this._setting);
    }
}
