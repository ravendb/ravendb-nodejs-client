/**
 * PostgreSQL-specific settings for a CDC Sink task.
 * These are optional on creation - if omitted, auto-generated names are used.
 * Once set (either by the user or auto-filled), these values are immutable.
 */
export interface CdcSinkPostgresSettings {
    /**
     * The PostgreSQL publication name used for logical replication.
     * If null on creation, auto-filled with an auto-generated name (rvn_cdc_p_{guid}).
     * Must be a valid PostgreSQL identifier (alphanumeric + underscore, max 63 chars).
     */
    publicationName?: string;

    /**
     * The PostgreSQL logical replication slot name.
     * If null on creation, auto-filled with an auto-generated name (rvn_cdc_s_{guid}).
     * Must be a valid PostgreSQL identifier (alphanumeric + underscore, max 63 chars).
     */
    slotName?: string;
}
