export type DatabaseItemType =
    "None"
    | "Documents"
    | "RevisionDocuments"
    | "Indexes"
    | "Identities"
    | "Tombstones"
    | "LegacyAttachments"
    | "Conflicts"
    | "CompareExchange"
    | "LegacyDocumentDeletions"
    | "LegacyAttachmentDeletions"
    | "DatabaseRecord"
    | "Unknown"
    /**
     * @deprecated Counters is not supported anymore. Will be removed in next major version of the product.
     */
    | "Counters"
    | "Attachments"
    | "CounterGroups"
    | "Subscriptions"
    | "CompareExchangeTombstones";