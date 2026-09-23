import { ArchivedDataProcessingBehavior } from "../DataArchival/ArchivedDataProcessingBehavior.js";
import { SubscriptionShardingState } from "./SubscriptionShardingState.js";

export interface SubscriptionState {
    query: string;
    changeVectorForNextBatchStartingPoint: string;
    subscriptionId: number;
    subscriptionName: string;
    mentorNode: string;
    pinToMentorNode: boolean;
    nodeTag: string;
    lastBatchAckTime: string;
    lastClientConnectionTime: string;
    raftCommandIndex: number;
    disabled: boolean;
    archivedDataProcessingBehavior: ArchivedDataProcessingBehavior;
    shardingState: SubscriptionShardingState;
}
