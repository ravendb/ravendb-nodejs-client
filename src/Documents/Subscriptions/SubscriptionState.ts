
export interface SubscriptionState {
    query: string;
    changeVectorForNextBatchStartingPoint: string;
    subscriptionName: string;
    mentorName: string;
    nodeTag: string;
    lastBatchAckTime: string;
    lastClientConnectionTime: string;
    disabled: boolean;
}
