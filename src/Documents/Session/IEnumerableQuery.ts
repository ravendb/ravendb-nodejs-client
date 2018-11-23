import { ErrorFirstCallback } from "../../Types/Callbacks";

export interface IEnumerableQuery<T extends object> {

    /**
     * Materialize query, executes request and returns with results
     */
    all(callback?: ErrorFirstCallback<T[]>): Promise<T[]>;

}
