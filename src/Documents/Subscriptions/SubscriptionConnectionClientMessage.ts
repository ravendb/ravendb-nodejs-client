export interface SubscriptionConnectionClientMessage {
    type: MessageType;
    changeVector: string;

}

export type MessageType = "None" | "Acknowledge" | "DisposedNotification";
