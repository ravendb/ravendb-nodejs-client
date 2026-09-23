export type SubscriptionWorkerState =
    "NotStarted"
    | "Connecting"
    | "WaitingForDocuments"
    | "Processing"
    | "Retrying"
    | "Faulted"
    | "Stopped";
