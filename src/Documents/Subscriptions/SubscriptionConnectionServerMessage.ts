
export interface SubscriptionConnectionServerMessage {
    type: MessageType;
    status: ConnectionStatus;
    data: any;
    includes: any;
    exception: string;
    message: string;
}

export interface SubscriptionRedirectData {
    currentTag: string;
    redirectedTag: string;
}

export type MessageType = "None" | "ConnectionStatus" | "EndOfBatch" | "Data" | "Includes" | "Confirm" | "Error";

export type ConnectionStatus =
    "None"
    | "Accepted"
    | "InUse"
    | "Closed"
    | "NotFound"
    | "Redirect"
    | "ForbiddenReadOnly"
    | "Forbidden"
    | "Invalid"
    | "ConcurrencyReconnect";
