import { ReplicationNode } from "./ReplicationNode.js";


export interface ExternalReplicationBase extends ReplicationNode {
    taskId?: number;
    name?: string;
    connectionStringName: string;
    mentorNode?: string;
    pinToMentorNode?: boolean;
}