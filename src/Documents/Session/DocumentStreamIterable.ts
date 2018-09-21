import { StreamResult } from "../Commands/StreamResult";
import { IDisposable } from "../../Types/Contracts";
import { EventEmitter } from "events";
import * as stream from "readable-stream";
import { TypedEventEmitter } from "../../Primitives/Events";
import { StreamQueryStatistics } from "./StreamQueryStatistics";

export interface StreamingQueryEvents {
    "afterStreamExecuted": object;
}

export interface DocumentStreamResultEvents<TEntity extends object> {
    "data": StreamResult<TEntity>;
    "error": Error;
    "stats": StreamQueryStatistics;
    "end": void;
}

export interface DocumentResultStream<T extends object> 
        extends TypedEventEmitter<DocumentStreamResultEvents<T>>  {
    pipe(destination: stream.Writable, options?: { end?: boolean; }): T;
}