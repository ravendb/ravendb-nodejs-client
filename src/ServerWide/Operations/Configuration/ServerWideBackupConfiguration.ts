import { PeriodicBackupConfiguration } from "../../../Documents/Operations/Backups/PeriodicBackupConfiguration";
import { IServerWideTask } from "../OngoingTasks/IServerWideTask";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerWideBackupConfiguration extends PeriodicBackupConfiguration, IServerWideTask {
}
