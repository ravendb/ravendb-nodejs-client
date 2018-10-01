import {ResponseTimeInformation} from "../../ResponseTimeInformation";

/**
 * Allow to perform eager operations on the session
 */
export interface IEagerSessionOperations {
    // TBD ResponseTimeInformation ExecuteAllPendingLazyOperations();

    /**
     * Execute all the lazy requests pending within this session
     */
    executeAllPendingLazyOperations(): Promise<ResponseTimeInformation>;
}
