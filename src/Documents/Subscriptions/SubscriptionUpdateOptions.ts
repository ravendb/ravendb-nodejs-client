import { SubscriptionCreationOptions } from "./SubscriptionCreationOptions";

export interface SubscriptionUpdateOptions extends SubscriptionCreationOptions {
    id: number;
    createNew: boolean;
}