/**
 * Controls how a CDC Sink column is stored in the target RavenDB document.
 *
 * - "Default": store as a document property with standard type conversion.
 *   int/smallint/bigint become numbers, real/float/double become doubles,
 *   boolean becomes bool, date/timestamp become dates, uuid/varchar/text become strings,
 *   arrays become JSON arrays. JSON/JSONB columns are stored as plain strings unless
 *   explicitly marked as "Json".
 * - "Json": parse the string value as its native JSON type in the document.
 *   Handles all JSON value types: objects, arrays, strings, numbers, booleans, and null.
 *   Use for json/jsonb columns in PostgreSQL, or nvarchar(max) with JSON content in SQL Server.
 *   Without this type, JSON values are stored as escaped strings.
 * - "Attachment": store as a RavenDB attachment instead of a document property.
 */
export type CdcColumnType =
    "Default"
    | "Json"
    | "Attachment";
