import { StreamResult } from "../Commands/StreamResult";

export class DocumentStreamIterableFactory {
    static create<T>(): Iterable<Promise<StreamResult<T>>> {

    }
}