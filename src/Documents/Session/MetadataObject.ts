import { AttachmentDetails } from "../Attachments";

export interface MetadataObject {
    "@attachments"?: AttachmentDetails[];
    "@collection"?: string;
    "@id"?: string;
    "@last-modified"?: string;
    "@flags"?: string;
    "@counters"?: string[];
    "@expires"?: string;
    "@change-vector"?: string;
    "Raven-Node-Type"?: string;
    "@timeseries"?: string[];
    "@nested-object-types"?: { [key: string]: string };
}
