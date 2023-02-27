
export interface SubscriptionState {
    query: string;
    changeVectorForNextBatchStartingPoint: string;
    subscriptionId: number;
    subscriptionName: string;
    mentorNode: string;
    nodeTag: string;
    lastBatchAckTime: string;
    lastClientConnectionTime: string;
    disabled: boolean;
}
