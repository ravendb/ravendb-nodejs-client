import { MetadataObject } from "./Documents/Session/MetadataObject";

export const CONSTANTS = {
    Documents: {
        Indexing: {
            Fields: {
                ALL_FIELDS: "__all_fields",
                DOCUMENT_ID_FIELD_NAME: "id()",
                SOURCE_DOCUMENT_ID_FIELD_NAME: "sourceDocId()",
                REDUCE_KEY_HASH_FIELD_NAME: "hash(key())",
                REDUCE_KEY_KEY_VALUE_FIELD_NAME: "key()",
                VALUE_FIELD_NAME: "value()",
                SPATIAL_SHAPE_FIELD_NAME: "spatial(shape)",
                // TBD 4.1 CUSTOM_SORT_FIELD_NAME: "__customSort",
            },
            Spatial: {
                DEFAULT_DISTANCE_ERROR_PCT: 0.025,
            },
            SIDE_BY_SIDE_INDEX_NAME_PREFIX: "ReplacementOf/",
        },
        Metadata: {
            COLLECTION: "@collection",
            PROJECTION: "@projection",
            KEY: "@metadata",
            ID: "@id",
            CONFLICT: "@conflict",
            ID_PROPERTY: "id",
            FLAGS: "@flags",
            ATTACHMENTS: "@attachments",
            INDEX_SCORE: "@index-score",
            LAST_MODIFIED: "@last-modified",
            RAVEN_JS_TYPE: "Raven-Node-Type" as keyof MetadataObject & "Raven-Node-Type",
            CHANGE_VECTOR: "@change-vector",
            EXPIRES: "@expires",
            REFRESH: "@refresh",
            ALL_DOCUMENTS_COLLECTION: "@all_docs",
            EMPTY_COLLECTION: "@empty",
            NESTED_OBJECT_TYPES: "@nested-object-types",
            NESTED_OBJECT_TYPES_PROJECTION_FIELD: "__PROJECTED_NESTED_OBJECT_TYPES__",
            COUNTERS: "@counters",
            TIME_SERIES: "@timeseries",
            REVISION_COUNTERS: "@counters-snapshot",
            REVISION_TIME_SERIES: "@timeseries-snapshot",
            IGNORE_CASE_TRANSFORM_REGEX:
                /^@metadata(\.(@collection|@projection|@id|@conflict|@flags|Raven-Node-Type|@index-score|@last-modified|@change-vector|@expires|@nested-object-types(\.\w+)?))?$/
        },

        PeriodicBackup: {
            FULL_BACKUP_EXTENSION: "ravendb-full-backup",
            SNAPSHOT_EXTENSION: "ravendb-snapshot",
            ENCRYPTED_FULL_BACKUP_EXTENSION: ".ravendb-encrypted-full-backup",
            ENCRYPTED_SNAPSHOT_EXTENSION: ".ravendb-encrypted-snapshot",
            INCREMENTAL_BACKUP_EXTENSION: "ravendb-incremental-backup",
            ENCRYPTED_INCREMENTAL_BACKUP_EXTENSION: ".ravendb-encrypted-incremental-backup",

            Folders: {
                INDEXES: "Indexes",
                DOCUMENTS: "Documents",
                CONFIGURATION: "Configuration"
            }
        }
    }
} as const;

export const HEADERS = {
    REQUEST_TIME: "Raven-Request-Time",
    REFRESH_TOPOLOGY: "Refresh-Topology",
    TOPOLOGY_ETAG: "Topology-Etag",
    CLUSTER_TOPOLOGY_ETAG: "Cluster-Topology-Etag",
    LAST_KNOWN_CLUSTER_TRANSACTION_INDEX: "Known-Raft-Index",
    CLIENT_CONFIGURATION_ETAG: "Client-Configuration-Etag",
    REFRESH_CLIENT_CONFIGURATION: "Refresh-Client-Configuration",
    CLIENT_VERSION: "Raven-Client-Version",
    SERVER_VERSION: "Raven-Server-Version",
    ETAG: "ETag",
    IF_NONE_MATCH: "If-None-Match",
    TRANSFER_ENCODING: "Transfer-Encoding",
    CONTENT_ENCODING: "Content-Encoding",
    CONTENT_LENGTH: "Content-Length",
    INCREMENTAL_TIME_SERIES_PREFIX: "INC:",
    DATABASE_MISSING: "Database-Missing"
} as const;

export const COUNTERS = {
    ALL: "@all_counters"
} as const;


export const TIME_SERIES = {
    SELECT_FIELD_NAME: "timeseries",
    QUERY_FUNCTION: "__timeSeriesQueryFunction",
    ALL: "@all_timeseries"
} as const;


export const COMPARE_EXCHANGE = {
    RVN_ATOMIC_PREFIX: "rvn-atomic/",
    OBJECT_FIELD_NAME: "Object"
} as const;

export const INDEXES = {
    INDEXING_STATIC_SEARCH_ENGINE_TYPE: "Indexing.Static.SearchEngineType"
} as const;

export const IDENTITIES = {
    DEFAULT_SEPARATOR: "/"
} as const;

export const OBSOLETE = {
    GRAPH_API: "Graph API will be removed in next major version of the product."
}
