import { RetentionPolicy } from "./RetentionPolicy.js";
import { BackupConfiguration } from "./BackupConfiguration.js";

export interface PeriodicBackupConfiguration extends BackupConfiguration {
    name?: string;
    taskId?: number;
    disabled?: boolean;
    mentorNode?: string;
    pinToMentorNode?: boolean;
    retentionPolicy?: RetentionPolicy;
    createdAt?: string;

    fullBackupFrequency?: string;
    incrementalBackupFrequency?: string;
}
