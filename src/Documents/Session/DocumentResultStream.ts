import { StreamResult } from "../Commands/StreamResult";
import { StreamQueryStatistics } from "./StreamQueryStatistics";

export interface DocumentStreamResultEvents<TEntity extends object> {
    data: StreamResult<TEntity>;
    error: Error;
    stats: StreamQueryStatistics;
    end: void;
}

export type DocumentResultStream<T extends object> = NodeJS.ReadableStream;
