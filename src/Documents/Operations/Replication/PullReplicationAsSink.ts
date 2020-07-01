import { ExternalReplication } from "../../..";

export interface PullReplicationAsSink extends ExternalReplication {
    certificateWithPrivateKey: string;
    certificatePassword: string;
    hubDefinitionName: string;
}