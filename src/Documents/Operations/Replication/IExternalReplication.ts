
export interface IExternalReplication {
    disabled?: boolean;
    taskId?: number;
    name?: string;
    mentorNode?: string;
    pinToMentorNode?: boolean;
    delayReplicationFor?: string;
}