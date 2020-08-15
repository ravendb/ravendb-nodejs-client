import { IDisposable } from "../../../Types/Contracts";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { ICommandData } from "../CommandData";
import { BatchOptions } from "./BatchOptions";
import { TransactionMode } from "../../Session/TransactionMode";
import { SingleNodeBatchCommand } from "./SingleNodeBatchCommand";

/**
 * @deprecated BatchCommand is not supported anymore. Will be removed in next major version of the product.
 */
export class BatchCommand extends SingleNodeBatchCommand implements IDisposable, IRaftCommand {

    constructor(conventions: DocumentConventions, commands: ICommandData[], options?: BatchOptions, mode?: TransactionMode) {
        super(conventions, commands, options, mode);
    }


    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

    // tslint:disable-next-line:no-empty
    public dispose(): void {
        super.dispose();
    }
}