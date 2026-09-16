export type LogLevel =
    "Trace"
    | "Debug"
    | "Info"
    | "Warn"
    | "Error"
    | "Fatal"
    | "Off";

/**
 * Neutral - the filter does not decide whether to log or discard the message.
 * Log / Ignore - the message should (not) be logged.
 * LogFinal / IgnoreFinal - same as above, and processing of further filters stops.
 */
export type LogFilterAction =
    "Neutral"
    | "Log"
    | "Ignore"
    | "LogFinal"
    | "IgnoreFinal";
