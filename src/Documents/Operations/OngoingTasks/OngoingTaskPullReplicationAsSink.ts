import { OngoingTask } from "./OngoingTask";
import { PullReplicationMode } from "../Replication/PullReplicationMode";


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
}