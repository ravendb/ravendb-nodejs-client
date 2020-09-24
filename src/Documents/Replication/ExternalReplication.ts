import { ExternalReplicationBase } from "./ExternalReplicationBase";

export interface ExternalReplication extends ExternalReplicationBase {
    delayReplicationFor?: number;
}
