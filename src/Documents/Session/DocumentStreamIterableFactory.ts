import { StreamResult } from "../Commands/StreamResult";
import * as stream from "readable-stream";

export class DocumentStreamIterableFactory {
    static create<T>(): Iterable<Promise<StreamResult<T>>> {

    }
}