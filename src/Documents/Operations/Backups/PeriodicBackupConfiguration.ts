import { RetentionPolicy } from "./RetentionPolicy";
import { BackupConfiguration } from "./BackupConfiguration";

export interface PeriodicBackupConfiguration extends BackupConfiguration {
    name?: string;
    taskId?: number;
    disabled?: boolean;
    mentorNode?: string;
    retentionPolicy?: RetentionPolicy;
    createdAt?: string;

    fullBackupFrequency?: string;
    incrementalBackupFrequency?: string;
}
