import { StreamResult } from "../Commands/StreamResult";

export class DocumentStreamIterableFactory {
    public static create<T>(): Iterable<Promise<StreamResult<T>>> {

    }
}
