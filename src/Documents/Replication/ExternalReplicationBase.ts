import { ReplicationNode } from "./ReplicationNode";


export interface ExternalReplicationBase extends ReplicationNode {
    taskId?: number;
    name?: string;
    connectionStringName: string;
    mentorName?: string;
}