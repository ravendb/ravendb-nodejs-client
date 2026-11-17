import { IMaintenanceOperation, OperationResultType } from "../../Documents/Operations/OperationAbstractions.js";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { throwError } from "../../Exceptions/index.js";
import { PrefixedShardingCommand } from "./PrefixedShardingCommand.js";

export class DeletePrefixedShardingSettingOperation implements IMaintenanceOperation<void> {
    private readonly _prefix: string;

    public constructor(prefix: string) {
        if (!prefix) {
            throwError("InvalidArgumentException", "Prefix cannot be null or empty");
        }
        this._prefix = prefix;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new PrefixedShardingCommand("DELETE", { prefix: this._prefix });
    }
}
