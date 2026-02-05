/**
 * Result of a configure remote attachments operation.
 * Contains information about the Raft command execution.
 */
export class ConfigureRemoteAttachmentsOperationResult {
    /**
     * The index of the Raft command that was executed to configure remote attachments.
     * This value is null if the operation was not executed through the Raft consensus mechanism.
     */
    public raftCommandIndex?: number;
}
