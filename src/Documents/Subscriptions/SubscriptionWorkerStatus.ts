import { SubscriptionWorkerState } from "./SubscriptionWorkerState.js";

export interface SubscriptionWorkerStatus {
    readonly state: SubscriptionWorkerState;
    readonly error: Error;
    readonly sinceUtc: Date;
    readonly failingSinceUtc: Date;
}
