import { ReplicationNode } from "./ReplicationNode";

export interface ExternalReplication extends ReplicationNode {
    taskId?: number;
    name?: string;
    connectionStringName: string;
    mentorName?: string;
}
