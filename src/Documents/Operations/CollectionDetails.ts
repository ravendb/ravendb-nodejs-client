import { Size } from "../../Utility/SizeUtil.js";

export interface CollectionDetails {
    name: string;
    countOfDocuments: number;
    countOfTombstones: number;
    countOfRevisions: number;
    countOfTimeSeriesDeletedRanges: number;
    countOfCounterEntries: number;
    countOfTimeSeriesSegments: number;
    size: Size;
    documentsSize: Size;
    tombstonesSize: Size;
    revisionsSize: Size;
    timeSeriesSegmentsSize: Size;
    timeSeriesDeletedRangesSize: Size;
    counterEntriesSize: Size;
}
