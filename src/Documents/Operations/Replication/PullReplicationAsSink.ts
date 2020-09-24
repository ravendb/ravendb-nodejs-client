import { ExternalReplicationBase } from "../../Replication/ExternalReplicationBase";

export interface PullReplicationAsSink extends ExternalReplicationBase {
    certificateWithPrivateKey?: string;
    certificatePassword?: string;
    hubDefinitionName: string;
}