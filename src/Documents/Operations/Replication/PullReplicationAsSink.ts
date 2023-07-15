import { ExternalReplicationBase } from "../../Replication/ExternalReplicationBase";
import { PullReplicationMode } from "./PullReplicationMode";

export interface PullReplicationAsSink extends ExternalReplicationBase {
    mode: PullReplicationMode;
    allowedHubToSinkPaths?: string[];
    allowedSinkToHubPaths?: string[];
    certificateWithPrivateKey?: string;
    certificatePassword?: string;
    accessName?: string;
    hubName?: string;

    /**
     * @deprecated Use HubName instead
     */
    hubDefinitionName?: string;
}
