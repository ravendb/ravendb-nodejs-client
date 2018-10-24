import { SubscriptionConnectionServerMessage } from "./SubscriptionConnectionServerMessage";

export interface BatchFromServer {
    messages: SubscriptionConnectionServerMessage[];
    includes: object[];
}
