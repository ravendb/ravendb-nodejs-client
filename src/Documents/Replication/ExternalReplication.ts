import { ExternalReplicationBase } from "./ExternalReplicationBase";
import { IExternalReplication } from "../Operations/Replication/IExternalReplication";

export interface ExternalReplication extends ExternalReplicationBase, IExternalReplication {
    delayReplicationFor?: number;
}
