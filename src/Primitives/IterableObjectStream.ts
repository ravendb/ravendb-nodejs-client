import * as stream from "readable-stream";
import { IDisposable } from "../Types/Contracts";

export interface IterableObjectStream<T> 
    extends NodeJS.ReadableStream, Iterable<T>, IDisposable {}