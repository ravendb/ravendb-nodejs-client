export interface ClusterNodeStatus {
    name: string;
    connected: boolean;
    errorDetails: string;
    lastSent: Date;
    lastReply: Date;
    lastSentMessage: string;
    lastMatchingIndex: number;
}
