
export interface SubscriptionConnectionServerMessage {
    type: MessageType;
    status?: ConnectionStatus;
    data?: any;
    includes?: any;
    counterIncludes?: any;
    includedCounterNames?: Record<string, string[]>;
    timeSeriesIncludes?: any;
    exception?: string;
    message?: string;
}

export interface SubscriptionRedirectData {
    CurrentTag: string;
    RedirectedTag: string;
    Reasons: Record<string, string>[];
    RegisterConnectionDurationInTicks: number;
}

export type MessageType = "None"
    | "ConnectionStatus"
    | "EndOfBatch"
    | "Data"
    | "Includes"
    | "CounterIncludes"
    | "TimeSeriesIncludes"
    | "Confirm"
    | "Error";

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
