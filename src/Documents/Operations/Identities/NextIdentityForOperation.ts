import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { StringUtil } from "../../../Utility/StringUtil";
import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { NextIdentityForCommand } from "../../Commands/NextIdentityForCommand";

export class NextIdentityForOperation implements IMaintenanceOperation<number> {
    private readonly _identityName: string;

    public constructor(name: string) {
        if (StringUtil.isNullOrWhitespace(name)) {
            throwError("InvalidArgumentException", "The field name cannot be null or whitespace.");
        }

        this._identityName = name;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<number> {
        return new NextIdentityForCommand(this._identityName);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}
