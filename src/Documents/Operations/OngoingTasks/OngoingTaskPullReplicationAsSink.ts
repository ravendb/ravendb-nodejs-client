import { OngoingTask } from "./OngoingTask";


export interface OngoingTaskPullReplicationAsSink extends OngoingTask {
    taskType: "PullReplicationAsSink";

    hubDefinitionName: string;
    destinationUrl: string;
    topologyDiscoveryUrls: string[];
    destinationDatabase: string;
    connectionStringName: string;
    certificatePublicKey: string;
}