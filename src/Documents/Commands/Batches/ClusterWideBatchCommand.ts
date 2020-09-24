import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { ICommandData } from "../CommandData";
import { BatchOptions } from "./BatchOptions";
import { SingleNodeBatchCommand } from "./SingleNodeBatchCommand";

export class ClusterWideBatchCommand extends SingleNodeBatchCommand implements IRaftCommand {
    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }

    public constructor(conventions: DocumentConventions, commands: ICommandData[], options?: BatchOptions) {
        super(conventions, commands, options, "ClusterWide");
    }
}