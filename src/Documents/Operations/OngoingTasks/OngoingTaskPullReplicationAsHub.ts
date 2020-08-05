import { OngoingTask } from "./OngoingTask";

export interface OngoingTaskPullReplicationAsHub extends OngoingTask {
    //TODO: setTaskType(OngoingTaskType.PULL_REPLICATION_AS_HUB);

    destinationUrl: string;
    destinationDatabase: string;
    delayReplicationFor: string; //TODO: string or number?
}
