import { OngoingTask } from "./OngoingTask";

export interface OngoingTaskPullReplicationAsHub extends OngoingTask {
    taskType: "PullReplicationAsHub";

    destinationUrl: string;
    destinationDatabase: string;
    delayReplicationFor: string;
}
