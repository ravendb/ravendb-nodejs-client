import { LogFilterAction, LogLevel } from "./LogLevel.js";

export interface LogFilter {
    minLevel: LogLevel;
    maxLevel: LogLevel;
    condition: string;
    action: LogFilterAction;
}
