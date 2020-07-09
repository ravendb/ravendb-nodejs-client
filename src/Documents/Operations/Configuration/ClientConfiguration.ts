import { ReadBalanceBehavior } from "../../../Http/ReadBalanceBehavior";

export interface ClientConfiguration {
    etag?: number;
    disabled?: boolean;
    maxNumberOfRequestsPerSession?: number;
    readBalanceBehavior?: ReadBalanceBehavior;
}
