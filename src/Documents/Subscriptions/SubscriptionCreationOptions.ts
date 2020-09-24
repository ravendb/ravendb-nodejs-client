import { DocumentType } from "../DocumentAbstractions";
import { ISubscriptionIncludeBuilder } from "../Session/Loaders/ISubscriptionIncludeBuilder";

export interface SubscriptionCreationOptions {
    name?: string;
    query?: string;
    includes?: (builder: ISubscriptionIncludeBuilder) => void;
    changeVector?: string;
    mentorNode?: string;
    documentType?: DocumentType;
}
