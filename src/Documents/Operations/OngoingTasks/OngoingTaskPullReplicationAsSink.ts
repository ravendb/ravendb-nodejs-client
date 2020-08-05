import { OngoingTask } from "./OngoingTask";


export interface OngoingTaskPullReplicationAsSink extends OngoingTask {
    //TODO  setTaskType(OngoingTaskType.PULL_REPLICATION_AS_SINK);

    hubDefinitionName: string;
    destinationUrl: string;
    topologyDiscoveryUrls: string[];
    destinationDatabase: string;
    connectionStringName: string;
    certificatePublicKey: string;
}