import { IndexInformation } from "./IndexInformation";
import { Size } from "../../Utility/SizeUtil";

export interface DatabaseStatistics {
    lastDocEtag: number;
    lastDatabaseEtag: number;
    countOfIndexes: number;
    countOfDocuments: number;
    countOfRevisionDocuments: number;
    countOfDocumentsConflicts: number;
    countOfTombstones: number;
    countOfConflicts: number;
    countOfAttachments: number;
    countOfUniqueAttachments: number;
    countOfCounterEntries: number;
    countOfTimeSeriesSegments: number;

    indexes: IndexInformation[];

    databaseChangeVector: string;
    databaseId: string;
    pager: string;
    is64Bit: string;
    lastIndexingTime: Date;
    sizeOnDisk: Size;
    tempBuffersSizeOnDisk: Size;
    numberOfTransactionMergerQueueOperations: number;
}
