export interface ModifyOngoingTaskResult {
    taskId: number;
    raftCommandIndex: number;
    responsibleNode: string;
}
