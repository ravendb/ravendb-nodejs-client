import { ReadBalanceBehavior } from "../../../Http/ReadBalanceBehavior";
import { LoadBalanceBehavior } from "../../../Http/LoadBalanceBehavior";

export interface ClientConfiguration {
    identityPartsSeparator?: string;
    etag?: number;
    disabled?: boolean;
    maxNumberOfRequestsPerSession?: number;
    readBalanceBehavior?: ReadBalanceBehavior;
    loadBalanceBehavior?: LoadBalanceBehavior;
    loadBalancerContextSeed?: number;
}
