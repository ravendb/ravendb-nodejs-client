import { FeatureTaskDefinition } from "./FeatureTaskDefinition";

export interface PullReplicationDefinition extends FeatureTaskDefinition {
    delayReplicationFor?: string;
    mentorNode?: string;
}