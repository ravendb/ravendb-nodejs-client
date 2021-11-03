import { ExternalReplicationBase } from "../../Replication/ExternalReplicationBase";
import { PullReplicationMode } from "./PullReplicationMode";

export interface PullReplicationAsSink extends ExternalReplicationBase {
    certificateWithPrivateKey?: string;
    certificatePassword?: string;
    hubDefinitionName: string;
}