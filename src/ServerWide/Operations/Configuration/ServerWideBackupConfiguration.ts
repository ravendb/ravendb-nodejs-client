import { PeriodicBackupConfiguration } from "../../../Documents/Operations/Backups/PeriodicBackupConfiguration";
import { IServerWideTask } from "../OngoingTasks/IServerWideTask";

// tslint:disable-next-line:no-empty-interface
export interface ServerWideBackupConfiguration extends PeriodicBackupConfiguration, IServerWideTask {
}