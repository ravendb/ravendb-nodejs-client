
export interface SubscriptionState {
    query: string;
    changeVectorForNextBatchStartingPoint: string;
    subscriptionId: number;
    subscriptionName: string;
    mentorName: string;
    nodeTag: string;
    lastBatchAckTime: string;
    lastClientConnectionTime: string;
    disabled: boolean;
}
