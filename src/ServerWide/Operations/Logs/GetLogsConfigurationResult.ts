import { LogMode } from "./LogMode";

export interface GetLogsConfigurationResult {
    currentMode: LogMode;
    mode: LogMode;
    path: string;
    useUtcTime: boolean;
}