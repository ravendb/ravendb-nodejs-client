import { RequestExecutor } from "../../Http/RequestExecutor";
import { TransactionMode } from "./TransactionMode";

export interface SessionOptions {
    database?: string;
    requestExecutor?: RequestExecutor;
    noTracking?: boolean;
    noCaching?: boolean;
    transactionMode?: TransactionMode;
    disableAtomicDocumentWritesInClusterWideTransaction?: boolean;
}
