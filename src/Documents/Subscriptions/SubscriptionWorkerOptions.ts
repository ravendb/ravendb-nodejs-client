import { SubscriptionOpeningStrategy } from "./SubscriptionOpeningStrategy.js";
import { DocumentType } from "../DocumentAbstractions.js";

export interface SubscriptionWorkerOptions<T extends object> {
    subscriptionName?: string;
    timeToWaitBeforeConnectionRetry?: number;
    connectionStreamTimeout?: number;
    ignoreSubscriberErrors?: boolean;
    strategy?: SubscriptionOpeningStrategy;
    maxDocsPerBatch?: number;
    maxErroneousPeriod?: number;
    closeWhenNoDocsLeft?: boolean;
    documentType?: DocumentType<T>;
    workerId?: string;
}
