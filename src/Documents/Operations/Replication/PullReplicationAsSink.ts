import { ExternalReplication } from "../../Replication/ExternalReplication";

export interface PullReplicationAsSink extends ExternalReplication {
    certificateWithPrivateKey: string;
    certificatePassword: string;
    hubDefinitionName: string;
}