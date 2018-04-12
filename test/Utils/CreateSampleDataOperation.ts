import {IMaintenanceOperation} from "../../src/Documents/Operations/OperationAbstractions";
import { RavenCommand } from "../../src/Http/RavenCommand";
import { DocumentConventions, OperationResultType, ServerNode } from "../../src";
import { HttpRequestBase } from "../../src/Primitives/Http";

export class CreateSampleDataOperation implements IMaintenanceOperation<void> {

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new CreateSampleDataCommand();
    }
}

export class CreateSampleDataCommand extends RavenCommand<void> {

        public get isReadRequest(): boolean {
            return false;
        }

        public createRequest(node: ServerNode): HttpRequestBase {
            const uri = `${node.url}/databases/${node.database}/studio/sample-data`;
            return {
                method: "POST",
                uri
            };
        }
    }
