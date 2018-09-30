import { AbstractCallback } from "../../Types/Callbacks";

export interface IEnumerableQuery<T extends object> {

    /**
     * Materialize query, executes request and returns with results
     * @return results as list
     */
    all(callback?: AbstractCallback<T[]>): Promise<T[]>;

}
