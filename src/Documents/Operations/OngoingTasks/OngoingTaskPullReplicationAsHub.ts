import { OngoingTask } from "./OngoingTask.js";

export interface OngoingTaskPullReplicationAsHub extends OngoingTask {
    taskType: "PullReplicationAsHub";

    fromToString: string;
    destinationUrl: string;
    destinationDatabase: string;
    delayReplicationFor: string;
    handlerId: string;
    lastAcceptedChangeVectorFromDestination: string;
    sourceDatabaseChangeVector: string;
    lastSentEtag: number;
    lastDatabaseEtag: number;
}
