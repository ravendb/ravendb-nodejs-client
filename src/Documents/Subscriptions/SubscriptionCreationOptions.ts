import { DocumentType } from "../DocumentAbstractions";

export interface SubscriptionCreationOptions {
    name?: string;
    query?: string;
    changeVector?: string;
    mentorNode?: string;
    documentType?: DocumentType;
}
