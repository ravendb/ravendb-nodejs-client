import { OngoingTask } from "./OngoingTask.js";
import { PullReplicationMode } from "../Replication/PullReplicationMode.js";


export interface OngoingTaskPullReplicationAsSink extends OngoingTask {
    taskType: "PullReplicationAsSink";

    hubName: string;
    mode: PullReplicationMode;
    destinationUrl: string;
    topologyDiscoveryUrls: string[];
    destinationDatabase: string;
    connectionStringName: string;
    certificatePublicKey: string;
    accessName: string;
    allowedHubToSinkPaths: string[];
    allowedSinkToHubPaths: string[];

    hubCursor: string;
    sinkCursor: string;
}
