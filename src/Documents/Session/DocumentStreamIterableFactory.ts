import { StreamResult } from "../Commands/StreamResult";

//TODO: is it used? needed?
export class DocumentStreamIterableFactory {
    // tslint:disable-next-line:no-empty
    public static create<T>(): Iterable<Promise<StreamResult<T>>> {
        //TODO: any return value?
        return null;
    }
}
