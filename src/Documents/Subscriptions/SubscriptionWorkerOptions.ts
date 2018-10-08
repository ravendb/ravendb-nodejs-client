import { SubscriptionOpeningStrategy } from "./SubscriptionOpeningStrategy";
import { DocumentType } from "../DocumentAbstractions";

export interface SubscriptionWorkerOptions<T extends object> {
    subscriptionName?: string;
    timeToWaitBeforeConnectionRetry?: number;
    ignoreSubscriberErrors?: boolean;
    strategy?: SubscriptionOpeningStrategy;
    maxDocsPerBatch?: number;
    maxErroneousPeriod?: number;
    closeWhenNoDocsLeft?: boolean;
    documentType?: DocumentType<T>;
}
