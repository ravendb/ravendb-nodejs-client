import { MetadataObject } from "./Documents/Session/MetadataObject";

function typedKey<T, S extends keyof T>(key: S): S {
    return key;
}

export const CONSTANTS = {
    Documents: {
        Indexing: {
            Fields: {
                ALL_FIELDS: "__all_fields",
                DOCUMENT_ID_FIELD_NAME: "id()",
                REDUCE_KEY_HASH_FIELD_NAME: "hash(key())",
                REDUCE_KEY_KEY_VALUE_FIELD_NAME: "key()",
                SPATIAL_SHAPE_FIELD_NAME: "spatial(shape)",
                // TBD 4.1 CUSTOM_SORT_FIELD_NAME: "__customSort",
            },
            Spatial: {
                DEFAULT_DISTANCE_ERROR_PCT: 0.025,
            },
            SIDE_BY_SIDE_INDEX_NAME_PREFIX: "ReplacementOf/",
        },
        Metadata: {
            COLLECTION: typedKey<MetadataObject, "@collection">("@collection"),
            PROJECTION: "@projection" as keyof MetadataObject,
            KEY: "@metadata" as keyof MetadataObject, //tODO: check this keys!
            ID: typedKey<MetadataObject, "@id">("@id"),
            CONFLICT: "@conflict",
            ID_PROPERTY: "id",
            FLAGS: "@flags" as keyof MetadataObject,
            ATTACHMENTS: typedKey<MetadataObject, "@attachments">("@attachments"),
            INDEX_SCORE: "@index-score" as keyof MetadataObject,
            LAST_MODIFIED: typedKey<MetadataObject, "@last-modified">("@last-modified"),
            RAVEN_JS_TYPE: "Raven-Node-Type" as keyof MetadataObject & "Raven-Node-Type",
            CHANGE_VECTOR: typedKey<MetadataObject, "@change-vector">("@change-vector"),
            EXPIRES: typedKey<MetadataObject, "@expires">("@expires"),
            ALL_DOCUMENTS_COLLECTION: "@all_docs",
            EMPTY_COLLECTION: "@empty",
            NESTED_OBJECT_TYPES: typedKey<MetadataObject, "@nested-object-types">("@nested-object-types"),
            NESTED_OBJECT_TYPES_PROJECTION_FIELD: "__PROJECTED_NESTED_OBJECT_TYPES__",
            COUNTERS: typedKey<MetadataObject, "@counters">("@counters"),
            REVISION_COUNTERS: "@counters-snapshot",
            IGNORE_CASE_TRANSFORM_REGEX:
            // tslint:disable-next-line:max-line-length
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
};

export const HEADERS = {
    REQUEST_TIME: "Raven-Request-Time",
    REFRESH_TOPOLOGY: "Refresh-Topology",
    TOPOLOGY_ETAG: "Topology-Etag",
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
    DATABASE_MISSING: "Database-Missing"
};

export const COUNTERS = {
    ALL: "@all_counters"
};
