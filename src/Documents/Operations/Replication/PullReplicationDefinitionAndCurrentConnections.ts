import { PullReplicationDefinition } from "./PullReplicationDefinition";
import { OngoingTaskPullReplicationAsHub } from "../OngoingTasks/OngoingTaskPullReplicationAsHub";

export interface PullReplicationDefinitionAndCurrentConnections {
    definition: PullReplicationDefinition;
    ongoingTasks: OngoingTaskPullReplicationAsHub[];
}
