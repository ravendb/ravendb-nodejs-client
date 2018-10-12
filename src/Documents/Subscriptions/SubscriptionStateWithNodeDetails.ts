import { SubscriptionState } from "./SubscriptionState";
import { NodeId } from "./NodeId";

export interface SubscriptionStateWithNodeDetails extends SubscriptionState {
    responsibleNode: NodeId;
}
