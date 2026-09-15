import { LogFilterAction, LogLevel } from "./LogLevel.js";
import { LogFilter } from "./LogFilter.js";

export interface GetLogsConfigurationResult {
    logs: LogsConfiguration;
    auditLogs: AuditLogsConfiguration;
    microsoftLogs: MicrosoftLogsConfiguration;
    adminLogs: AdminLogsConfiguration;
}

export interface LogsConfiguration {
    path: string;
    currentMinLevel: LogLevel;
    currentFilters: LogFilter[];
    currentLogFilterDefaultAction: LogFilterAction;
    minLevel: LogLevel;
    archiveAboveSizeInMb: number;
    maxArchiveDays: number | null;
    maxArchiveFiles: number | null;
    enableArchiveFileCompression: boolean;
}

export interface AuditLogsConfiguration {
    path: string;
    level: LogLevel;
    archiveAboveSizeInMb: number;
    maxArchiveDays: number | null;
    maxArchiveFiles: number | null;
    enableArchiveFileCompression: boolean;
}

export interface MicrosoftLogsConfiguration {
    currentMinLevel: LogLevel;
    minLevel: LogLevel;
}

export interface AdminLogsConfiguration {
    currentMinLevel: LogLevel;
    currentFilters: LogFilter[];
    currentLogFilterDefaultAction: LogFilterAction;
}
