import {IndexInformation} from "../../Documents/Operations/IndexInformation";
import {Size} from "../../Utility/SizeUtil";

export interface DatabaseStatistics {
    lastDocEtag: number;
    countOfIndexes: number;
    countOfDocuments: number;
    countOfRevisionDocuments: number;
    countOfDocumentsConflicts: number;
    countOfTombstones: number;
    countOfConflicts: number;
    countOfAttachments: number;
    countOfUniqueAttachments: number;

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
