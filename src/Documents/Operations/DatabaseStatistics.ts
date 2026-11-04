import { IndexInformation } from "./IndexInformation.js";
import { Size } from "../../Utility/SizeUtil.js";
import { AbstractDatabaseStatistics } from "./AbstractDatabaseStatistics.js";

export interface DatabaseStatistics extends AbstractDatabaseStatistics<IndexInformation> {
    lastDocEtag: number;
    lastDatabaseEtag: number;
    countOfUniqueAttachments: number;

    databaseChangeVector: string;
    databaseId: string;
    pager: string;
    is64Bit: string;
    lastIndexingTime: Date;
    sizeOnDisk: Size;
    tempBuffersSizeOnDisk: Size;
    numberOfTransactionMergerQueueOperations: number;
    staleIndexes: string[];
}
