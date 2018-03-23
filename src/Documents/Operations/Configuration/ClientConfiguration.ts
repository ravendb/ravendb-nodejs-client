import { ReadBalanceBehavior } from "../../../Http/ReadBalanceBehavior";

export interface IClientConfiguration {
    etag: number;
    disabled: boolean;
    maxNumberOfRequestsPerSession: number;
    readBalanceBehavior: ReadBalanceBehavior;
}
