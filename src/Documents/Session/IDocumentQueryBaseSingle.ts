import { AbstractCallback } from "../../Types/Callbacks";

export interface IDocumentQueryBaseSingle<T extends object> {
    //TBD  Lazy<int> CountLazily();

    /**
     * Returns first element or throws if sequence is empty.
     * @return first result
     */
    first(callback?: AbstractCallback<T>): Promise<T>;

    /**
     * Returns first element or throws if sequence is empty or contains more than one element.
     * @return single result or throws
     */
    single(callback?: AbstractCallback<T>): Promise<T>;

    /**
     * Gets the total count of records for this query
     * @return total count of records
     */
    count(callback?: AbstractCallback<number>): Promise<number>;

    //TBD Lazy<IEnumerable<T>> Lazily(Action<IEnumerable<T>> onEval);

    /**
     * Checks if the given query matches any records
     * @return true if the given query matches any records
     */
    any(): Promise<boolean>;
}
