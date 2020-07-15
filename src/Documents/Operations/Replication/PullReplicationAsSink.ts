import { ExternalReplication } from "../../Replication/ExternalReplication";

export interface PullReplicationAsSink extends ExternalReplicationBase {
    certificateWithPrivateKey: string;
    certificatePassword: string;
    hubDefinitionName: string;
}