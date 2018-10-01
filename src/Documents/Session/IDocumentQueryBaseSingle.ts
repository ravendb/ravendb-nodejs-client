import {Lazy} from "../Lazy";
import {AbstractCallback} from "../../Types/Callbacks";

export interface IDocumentQueryBaseSingle<T extends object> {
    //TBD  Lazy<int> CountLazily();

    /**
     * Returns first element or throws if sequence is empty.
     */
    first(callback?: AbstractCallback<T>): Promise<T>;

    /**
     * Returns first element or throws if sequence is empty or contains more than one element.
     */
    single(callback?: AbstractCallback<T>): Promise<T>;

    /**
     * Gets the total count of records for this query
     */
    count(callback?: AbstractCallback<number>): Promise<number>;

    /**
     * Register the query as a lazy query in the session and return a lazy
     * instance that will evaluate the query only when needed.
     */
    lazily(): Lazy<T[]>;

    /**
     * Register the query as a lazy query in the session and return a lazy
     * instance that will evaluate the query only when needed.
     * Also provide a function to execute when the value is evaluated
     */
    lazily(onEval: (list: T[]) => void): Lazy<T[]>;

    /**
     * Checks if the given query matches any records
     */
    any(): Promise<boolean>;

    /**
     * Register the query as a lazy-count query in the session and return a lazy
     * instance that will evaluate the query only when needed.
     */
    countLazily(): Lazy<number>;
}
