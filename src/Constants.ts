
export const CONSTANTS = {
    Documents: {
        Indexing: {
            Fields: {
                 ALL_FIELDS: "__all_fields",
                 DOCUMENT_ID_FIELD_NAME: "id()",
                 REDUCE_KEY_HASH_FIELD_NAME: "hash(key())",
                 REDUCE_KEY_KEY_VALUE_FIELD_NAME: "key()",
                 SPATIAL_SHAPE_FIELD_NAME: "spatial(shape)",
                // TBD  CUSTOM_SORT_FIELD_NAME: "__customSort",
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
             ID_PROPERTY: "Id",
             FLAGS: "@flags",
             ATTACHMENTS: "@attachments",
             INDEX_SCORE: "@index-score",
             LAST_MODIFIED: "@last-modified",
             RAVEN_JAVA_TYPE: "Raven-Java-Type",
             CHANGE_VECTOR: "@change-vector",
             EXPIRES: "@expires",
        },
    }
};

export const HEADERS = {
        REQUEST_TIME: "Raven-Request-Time",
        REFRESH_TOPOLOGY: "Refresh-Topology",
        TOPOLOGY_ETAG: "Topology-Etag",
        CLIENT_CONFIGURATION_ETAG: "Client-Configuration-Etag",
        REFRESH_CLIENT_CONFIGURATION: "Refresh-Client-Configuration",
        ETAG: "ETag",
        IF_NONE_MATCH: "If-None-Match",
        TRANSFER_ENCODING: "Transfer-Encoding",
        CONTENT_ENCODING: "Content-Encoding",
        CONTENT_LENGTH: "Content-Length",
        DATABASE_MISSING: "Database-Missing"
};