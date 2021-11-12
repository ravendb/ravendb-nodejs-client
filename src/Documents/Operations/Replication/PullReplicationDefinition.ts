import { PreventDeletionsMode } from "./PreventDeletionsMode";
import { PullReplicationMode } from "./PullReplicationMode";

export interface PullReplicationDefinition {
    certificates?: Record<string, string>; // <thumbprint, base64 cert>
    delayReplicationFor?: string;
    disabled?: boolean;
    mentorNode?: string;

    mode?: PullReplicationMode;
    name: string;
    taskId?: number;
    withFiltering?: boolean;
    preventDeletionsMode?: PreventDeletionsMode;
}