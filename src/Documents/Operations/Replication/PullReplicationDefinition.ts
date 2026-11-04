import { PreventDeletionsMode } from "./PreventDeletionsMode.js";
import { PullReplicationMode } from "./PullReplicationMode.js";

export interface PullReplicationDefinition {
    delayReplicationFor?: string;
    disabled?: boolean;
    mentorNode?: string;
    pinToMentorNode?: boolean;

    mode?: PullReplicationMode;
    name: string;
    taskId?: number;
    withFiltering?: boolean;
    preventDeletionsMode?: PreventDeletionsMode;
}